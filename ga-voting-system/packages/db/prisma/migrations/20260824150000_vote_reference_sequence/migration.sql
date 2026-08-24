-- تسلسل ذرّي (atomic) لتوليد الرقم المرجعي للتصويت دون تعارض تحت الحمل المتزامن.
-- Postgres SEQUENCE يضمن قيمًا فريدة حتى مع آلاف المعاملات المتزامنة (nextval لا يُقفل ولا يتضارب).
CREATE SEQUENCE IF NOT EXISTS vote_reference_seq START WITH 1 INCREMENT BY 1;
