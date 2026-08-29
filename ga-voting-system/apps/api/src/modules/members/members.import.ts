import ExcelJS from "exceljs";
import { prisma } from "@ga/db";
import { MEMBER_IMPORT_COLUMNS } from "@ga/shared";
import { ApiError } from "../../utils/apiError";

const saudiPhoneRegex = /^(?:\+?966|0)?5\d{8}$/;

interface ParsedRow {
  rowNumber: number;
  fullName: string;
  nationalId: string;
  phone: string;
  email?: string;
  votingWeight: number;
  membershipNumberReal?: string;
}

interface RowError {
  rowNumber: number;
  rawDataJson: Record<string, unknown>;
  errorMessage: string;
}

function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("966")) return `0${digits.slice(3)}`;
  if (digits.startsWith("5")) return `0${digits}`;
  return digits;
}

/** يقرأ ملف Excel، يتحقق من الأعمدة والبيانات، ويكتشف التكرار (داخل الملف ومع القاعدة) */
export async function parseMembersExcel(buffer: Buffer) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as any);
  const sheet = workbook.worksheets[0];
  if (!sheet) throw new ApiError(422, "الملف لا يحتوي على أي ورقة عمل");

  const headerRow = sheet.getRow(1);
  const headerIndex: Record<string, number> = {};
  headerRow.eachCell((cell, colNumber) => {
    const value = String(cell.value ?? "").trim();
    headerIndex[value] = colNumber;
  });

  const missingColumns = MEMBER_IMPORT_COLUMNS.filter((col) => !(col in headerIndex));
  if (missingColumns.length > 0) {
    throw new ApiError(422, `أعمدة مفقودة في الملف: ${missingColumns.join("، ")}`);
  }

  const validRows: ParsedRow[] = [];
  const errors: RowError[] = [];
  const seenNationalIds = new Set<string>();
  const seenPhones = new Set<string>();
  const seenMembershipNumbers = new Set<string>();

  const totalRows = sheet.rowCount;

  for (let r = 2; r <= totalRows; r += 1) {
    const row = sheet.getRow(r);
    const cellText = (col: string) => String(row.getCell(headerIndex[col]).value ?? "").trim();

    const fullName = cellText("الاسم");
    const nationalId = cellText("الهوية");
    const phoneRaw = cellText("الجوال");
    const email = cellText("البريد الإلكتروني");
    const weightRaw = cellText("وزن الصوت");
    const membershipNumberReal = cellText("رقم العضوية الفعلي");

    const raw = { fullName, nationalId, phone: phoneRaw, email, votingWeight: weightRaw, membershipNumberReal };

    if (!fullName && !nationalId && !phoneRaw) continue; // صف فارغ بالكامل، تجاهله

    const rowErrors: string[] = [];
    if (!fullName || fullName.length < 3) rowErrors.push("الاسم مطلوب (3 أحرف على الأقل)");
    if (!nationalId || nationalId.length < 5) rowErrors.push("رقم الهوية غير صحيح");
    const phone = normalizePhone(phoneRaw);
    if (!saudiPhoneRegex.test(phone)) rowErrors.push("رقم الجوال غير صحيح");
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) rowErrors.push("البريد الإلكتروني غير صحيح");
    const votingWeight = weightRaw ? Number(weightRaw) : 1;
    if (Number.isNaN(votingWeight) || votingWeight <= 0) rowErrors.push("وزن الصوت يجب أن يكون رقمًا موجبًا");

    if (nationalId) {
      if (seenNationalIds.has(nationalId)) rowErrors.push("رقم الهوية مكرر داخل الملف");
      seenNationalIds.add(nationalId);
    }
    if (phone) {
      if (seenPhones.has(phone)) rowErrors.push("رقم الجوال مكرر داخل الملف");
      seenPhones.add(phone);
    }
    if (membershipNumberReal) {
      if (seenMembershipNumbers.has(membershipNumberReal)) rowErrors.push("رقم العضوية الفعلي مكرر داخل الملف");
      seenMembershipNumbers.add(membershipNumberReal);
    }

    if (rowErrors.length === 0) {
      const existing = await prisma.member.findFirst({
        where: {
          deletedAt: null,
          OR: [
            { nationalId },
            { phone },
            ...(membershipNumberReal ? [{ membershipNumberReal }] : []),
          ],
        },
      });
      if (existing) {
        rowErrors.push("يوجد عضو مسجل مسبقًا بنفس رقم الهوية أو الجوال أو رقم العضوية");
      }
    }

    if (rowErrors.length > 0) {
      errors.push({ rowNumber: r, rawDataJson: raw, errorMessage: rowErrors.join("، ") });
    } else {
      validRows.push({ rowNumber: r, fullName, nationalId, phone, email: email || undefined, votingWeight, membershipNumberReal: membershipNumberReal || undefined });
    }
  }

  return { validRows, errors, totalRows: validRows.length + errors.length };
}
