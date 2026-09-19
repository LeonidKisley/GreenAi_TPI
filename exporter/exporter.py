import time
import os
import psycopg2
from prometheus_client import start_http_server, Gauge

# Definir las métricas con las etiquetas de tu modelo de datos
CPU_UTIL = Gauge('greenai_cpu_utilization_pct', 'Uso de CPU en %', ['hostname', 'hardware_id'])
RAM_UTIL = Gauge('greenai_ram_utilization_pct', 'Uso de RAM en %', ['hostname', 'hardware_id'])
TEMP_CELSIUS = Gauge('greenai_temperatura_celsius', 'Temperatura °C', ['hostname', 'hardware_id'])
ENERGY_WATTS = Gauge('greenai_energia_watts', 'Consumo de energía en Watts', ['hostname', 'hardware_id'])

# Datos de conexión a tu BD (Supabase / PostgreSQL)
DB_HOST = os.getenv("DB_HOST", "tu_host_supabase")
DB_NAME = os.getenv("DB_NAME", "postgres")
DB_USER = os.getenv("DB_USER", "postgres")
DB_PASS = os.getenv("DB_PASS", "tu_contraseña")
DB_PORT = os.getenv("DB_PORT", "5432")

def collect_metrics():
    try:
        conn = psycopg2.connect(
            host=DB_HOST, database=DB_NAME, user=DB_USER, password=DB_PASS, port=DB_PORT
        )
        cur = conn.cursor()
        
        # Consulta SQL para traer la última telemetría por cada servidor registrado
        query = """
            SELECT DISTINCT ON (h.hardware_id) 
                h.hardware_id, h.hostname, l.cpu_utilization_pct, 
                l.ram_utilization_pct, l.temperatura_celsius, l.energia_watts
            FROM hardware h
            JOIN logs l ON h.hardware_id = l.hardware_id
            ORDER BY h.hardware_id, l.timestamp DESC;
        """
        cur.execute(query)
        rows = cur.fetchall()
        
        for row in rows:
            hw_id, hostname, cpu, ram, temp, watts = row
            # Actualizar los valores en Prometheus
            CPU_UTIL.labels(hostname=hostname, hardware_id=str(hw_id)).set(float(cpu or 0))
            RAM_UTIL.labels(hostname=hostname, hardware_id=str(hw_id)).set(float(ram or 0))
            TEMP_CELSIUS.labels(hostname=hostname, hardware_id=str(hw_id)).set(float(temp or 0))
            ENERGY_WATTS.labels(hostname=hostname, hardware_id=str(hw_id)).set(float(watts or 0))
            
        cur.close()
        conn.close()
    except Exception as e:
        print(f"Error consultando la BD: {e}")

if __name__ == '__main__':
    # Iniciar servidor web de métricas en el puerto 8000
    start_http_server(8000)
    print("Green AI Exporter escuchando en el puerto 8000...")
    while True:
        collect_metrics()
        time.sleep(15)  # Coincide con el scrape interval de Prometheus