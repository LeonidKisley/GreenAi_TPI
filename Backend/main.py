import uuid
from datetime import datetime
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

class UsuarioRegistro(BaseModel):
    nombre_completo: str
    email: str
    password: str
    rol: str = "OPERADOR"

@app.post("/api/registro")
def registrar_usuario(usuario: UsuarioRegistro):
    try:
        # Estructura alineada exactamente a tu diagrama ER
        nuevo_usuario = {
            "usuario_id": f"usr-{uuid.uuid4().hex[:8]}",
            "nombre_completo": usuario.nombre_completo,
            "email": usuario.email,
            "password": usuario.password,                # Columna varchar en tu BD
            "password_hash": f"hash_{usuario.password}", # Columna varchar en tu BD
            "rol": usuario.rol,
            "fecha_creacion": datetime.now().isoformat()
        }

        # Inserción en Supabase
        res = supabase.table("usuario").insert(nuevo_usuario).execute()
        return {"status": "ok", "data": res.data}

    except Exception as e:
        print(f"Error al insertar en la tabla usuario: {e}")
        raise HTTPException(status_code=500, detail=f"Error en BD: {str(e)}")