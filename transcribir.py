import sys
import os
from pydub import AudioSegment
import speech_recognition as sr

def convert_to_wav(file_path):
    """Convierte el archivo de audio/video a WAV."""
    file_extension = os.path.splitext(file_path)[1].lower()
    supported_formats = ['.mp3', '.mp4', '.wav', '.ogg', '.m4a', '.flac']
    
    if file_extension not in supported_formats:
        print(f"Error: Formato no soportado: {file_extension}")
        return None
    
    try:
        if file_extension == '.mp4':
            audio = AudioSegment.from_file(file_path, format='mp4')
        else:
            audio = AudioSegment.from_file(file_path)
        wav_path = file_path + ".wav"
        audio.export(wav_path, format="wav")
        return wav_path
    except Exception as e:
        print(f"Error al convertir el archivo: {e}")
        return None

def transcribe_audio(wav_path):
    """Transcribe el archivo WAV usando Google Speech Recognition."""
    recognizer = sr.Recognizer()
    with sr.AudioFile(wav_path) as source:
        audio_data = recognizer.record(source)
        try:
            text = recognizer.recognize_google(audio_data, language="es-ES")  # Cambia el idioma si es necesario
            return text
        except sr.UnknownValueError:
            return "No se pudo entender el audio."
        except sr.RequestError as e:
            return f"Error al conectar con el servicio de Google: {e}"

def main():
    if len(sys.argv) != 2:
        print("Error: Se requiere la ruta del archivo de audio.")
        sys.exit(1)
    
    input_path = sys.argv[1]
    
    # Convertir a WAV
    wav_path = convert_to_wav(input_path)
    if not wav_path:
        print("Error: No se pudo convertir el archivo a WAV.")
        sys.exit(1)
    
    # Transcribir
    text = transcribe_audio(wav_path)
    
    # Borrar archivo WAV temporal
    try:
        os.remove(wav_path)
    except Exception as e:
        print(f"Error al borrar archivo WAV: {e}")
    
    # Imprimir el texto para que el servidor lo capture
    print(text)

if __name__ == "__main__":
    main()