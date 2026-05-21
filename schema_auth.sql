-- Paso 1: Permitir que usuarios con sesión iniciada puedan insertar, actualizar y borrar materias
CREATE POLICY "Auth_Insert_Materias" ON materias FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Auth_Update_Materias" ON materias FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Auth_Delete_Materias" ON materias FOR DELETE USING (auth.role() = 'authenticated');

-- Paso 2: Aplicar la misma seguridad para grados y niveles
CREATE POLICY "Auth_Insert_Grados" ON grados FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Auth_Update_Grados" ON grados FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Auth_Delete_Grados" ON grados FOR DELETE USING (auth.role() = 'authenticated');

CREATE POLICY "Auth_Insert_Niveles" ON niveles FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Auth_Update_Niveles" ON niveles FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Auth_Delete_Niveles" ON niveles FOR DELETE USING (auth.role() = 'authenticated');

-- Paso 3: Permitir que TODOS puedan LEER (SELECT) el catálogo
CREATE POLICY "Public_Select_Materias" ON materias FOR SELECT USING (true);
CREATE POLICY "Public_Select_Grados" ON grados FOR SELECT USING (true);
CREATE POLICY "Public_Select_Niveles" ON niveles FOR SELECT USING (true);

