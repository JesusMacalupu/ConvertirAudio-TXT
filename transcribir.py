import whisper
import sys
import io

# Forzar salida UTF-8 en cualquier consola
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# Archivo de audio que recibe como argumento
audio_file = sys.argv[1]

# Cargar modelo Whisper
model = whisper.load_model("small") 

# Función para transcribir audio
def transcribe_audio(audio_file):
    # Transcribir con parámetros ajustados
    result = model.transcribe(audio_file, language='es', task='transcribe')
    return result["text"]

# Llamar a la función de transcripción
text = transcribe_audio(audio_file)

# Imprimir texto con tildes y ñ correctas
print(text)