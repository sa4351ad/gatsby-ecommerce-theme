import multer from "multer";
import { fileTypeFromBuffer } from "file-type";
import sharp from "sharp";
import { FILE_UPLOAD_LIMITS } from "@ga/shared";
import { ApiError } from "../utils/apiError";

/** تخزين مؤقت بالذاكرة — لا نثق بامتداد الملف، نتحقق من التوقيع الحقيقي لاحقًا */
export const excelUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: FILE_UPLOAD_LIMITS.EXCEL_MAX_BYTES },
});

export const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: FILE_UPLOAD_LIMITS.IMAGE_MAX_BYTES },
});

/** يتحقق من التوقيع الحقيقي (Magic Bytes) للملف — لا يكفي الاعتماد على الامتداد أو Content-Type المُرسَل */
export async function assertRealFileType(buffer: Buffer, allowedMime: string[]) {
  const type = await fileTypeFromBuffer(buffer);
  if (!type || !allowedMime.includes(type.mime)) {
    throw new ApiError(422, "نوع الملف غير مسموح به أو الملف تالف");
  }
  return type;
}

/** ضغط/تحجيم صورة العضو الشخصية إلى حجم موحّد آمن */
export async function optimizeAvatarImage(buffer: Buffer): Promise<Buffer> {
  return sharp(buffer)
    .resize(512, 512, { fit: "cover" })
    .jpeg({ quality: 82 })
    .toBuffer();
}
