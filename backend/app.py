# from flask import Flask, request, jsonify
# from flask_cors import CORS
# import tensorflow as tf
# from PIL import Image
# import numpy as np
# import os

# from care_report import generate_care_report

# app = Flask(__name__)
# CORS(app)

# # Define model path
# MODEL_PATH = 'model/my_modelsacin.tflite'
# IMAGE_SIZE = (64, 64)

# def load_model_from_local():
#     """Load TFLite model from local folder"""
#     try:
#         if not os.path.exists(MODEL_PATH):
#             raise FileNotFoundError(f"Model file not found at {MODEL_PATH}")
        
#         print(f"Loading model from {MODEL_PATH}")
#         interpreter = tf.lite.Interpreter(model_path=MODEL_PATH)
#         interpreter.allocate_tensors()
#         print("Model loaded successfully from local folder!")
#         return interpreter
#     except Exception as e:
#         print(f"Error loading model: {str(e)}")
#         raise

# # Load model from local folder
# print("Initializing Flask app...")
# model = load_model_from_local()

# @app.route('/predict', methods=['POST'])
# def predict():
#     if 'file' not in request.files:
#         return jsonify({'error': 'No file uploaded'}), 400

#     file = request.files['file']
    
#     # Check file type
#     if file.filename == '':
#         return jsonify({'error': 'No file selected'}), 400
    
#     try:
#         # Load and preprocess image
#         img = Image.open(file.stream).resize(IMAGE_SIZE).convert('RGB')
#         img_array = np.array(img) / 255.0
#         img_array = np.expand_dims(img_array, axis=0).astype(np.float32)

#         # Get input and output tensors
#         input_details = model.get_input_details()
#         output_details = model.get_output_details()

#         # Set input tensor
#         model.set_tensor(input_details[0]['index'], img_array)

#         # Run inference
#         model.invoke()

#         # Get output tensor
#         output_data = model.get_tensor(output_details[0]['index'])
#         prob = float(output_data[0][0])

#         # Handle prediction
#         label = 'pneumonia' if prob > 0.5 else 'normal'
#         confidence = prob if prob > 0.5 else 1 - prob

#         # Generate report
#         diagnosis_report = generate_care_report(label)

#         return jsonify({
#             'label': label,
#             'probability': prob,
#             'confidence': confidence,
#             'report': diagnosis_report,
#             'status': 'success'
#         })
        
#     except Exception as e:
#         print(f"Prediction error: {str(e)}")
#         return jsonify({'error': f'Prediction failed: {str(e)}'}), 500

# @app.route('/health', methods=['GET'])
# def health_check():
#     """Health check endpoint to verify model is loaded"""
#     return jsonify({
#         'status': 'healthy',
#         'model_loaded': model is not None,
#         'model_path': MODEL_PATH,
#         'expected_input_size': IMAGE_SIZE,
#         'tensorflow_version': tf.__version__
#     })

# @app.route('/reload-model', methods=['POST'])
# def reload_model():
#     """Endpoint to reload model from local folder"""
#     global model
#     try:
#         print("Reloading model from local folder...")
#         model = load_model_from_local()
#         return jsonify({
#             'status': 'success',
#             'message': 'Model reloaded successfully from local folder'
#         })
#     except Exception as e:
#         print(f"Model reload error: {str(e)}")
#         return jsonify({
#             'status': 'error',
#             'message': f'Failed to reload model: {str(e)}'
#         }), 500

# @app.route('/', methods=['GET'])
# def home():
#     """Home endpoint"""
#     return jsonify({
#         'message': 'Pneumonia Detection API',
#         'status': 'running',
#         'endpoints': {
#             '/predict': 'POST - Upload chest X-ray for pneumonia detection',
#             '/health': 'GET - Check API health status',
#             '/reload-model': 'POST - Reload model from local folder'
#         }
#     })

# @app.errorhandler(404)
# def not_found(error):
#     return jsonify({'error': 'Endpoint not found'}), 404

# @app.errorhandler(500)
# def internal_error(error):
#     return jsonify({'error': 'Internal server error'}), 500

# if __name__ == '__main__':
#     print("Starting Flask server...")
#     print("API endpoints:")
#     print("- POST /predict: Upload chest X-ray image")
#     print("- GET /health: Check API status")
#     print("- POST /reload-model: Reload model from local folder")
#     print("- GET /: API information")
#     print(f"Server running on http://localhost:5000")
    
#     app.run(host='0.0.0.0', port=5000, debug=True)


from flask import Flask, request, jsonify
from flask_cors import CORS
import tensorflow as tf
from PIL import Image
import numpy as np
import os
from dotenv import load_dotenv
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

# Load environment variables from .env file
load_dotenv()

from care_report import generate_care_report

app = Flask(__name__)

# Configure CORS
# In production, specify the exact origin(s)
cors_origins = os.environ.get('CORS_ORIGINS', '*').split(',')
CORS(app, resources={r"/*": {"origins": cors_origins}})

# Initialize Rate Limiter
limiter = Limiter(
    get_remote_address,
    app=app,
    default_limits=["200 per day", "50 per hour"],
    storage_uri="memory://"
)

MODEL_PATH = os.environ.get('MODEL_PATH', 'model/my_modelsacin.tflite')
IMAGE_SIZE = (64, 64)

def extract_severity(prob, output_data):
    # Example dynamic placeholder
    # You may replace below logic with actual multiparameter severity extraction if your model supports
    # Here, just using probability as an example
    if prob < 0.65:
        return "mild"
    elif prob < 0.85:
        return "moderate"
    else:
        return "severe"

def load_model_from_local():
    try:
        if not os.path.exists(MODEL_PATH):
            raise FileNotFoundError(f"Model file not found at {MODEL_PATH}")
        print(f"Loading model from {MODEL_PATH}")
        interpreter = tf.lite.Interpreter(model_path=MODEL_PATH)
        interpreter.allocate_tensors()
        print("Model loaded successfully from local folder!")
        return interpreter
    except Exception as e:
        print(f"Error loading model: {str(e)}")
        raise

print("Initializing Flask app...")
model = load_model_from_local()

@app.route('/predict', methods=['POST'])
@limiter.limit("10 per minute")
def predict():
    if 'file' not in request.files:
        return jsonify({'error': 'No file uploaded'}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400

    # Optionally process extra form fields (age, symptoms etc. can be added dynamically)
    # For now, only image

    try:
        img = Image.open(file.stream).resize(IMAGE_SIZE).convert('RGB')
        img_array = np.array(img) / 255.0
        img_array = np.expand_dims(img_array, axis=0).astype(np.float32)

        input_details = model.get_input_details()
        output_details = model.get_output_details()
        model.set_tensor(input_details[0]['index'], img_array)
        model.invoke()
        output_data = model.get_tensor(output_details[0]['index'])
        prob = float(output_data[0][0])

        label = 'pneumonia' if prob > 0.5 else 'normal'
        confidence = prob if prob > 0.5 else 1 - prob

        # Dynamically set patient_info, optionally from request.form fields
        patient_info = {
            "location": request.form.get("location", "Parasarampuram, AP"),
            "age": request.form.get("age"),
            "symptoms": request.form.get("symptoms"),
        }

        # If pneumonia, dynamically add severity
        if label == "pneumonia":
            severity = extract_severity(prob, output_data)
            patient_info["severity"] = severity

        diagnosis_report = generate_care_report(label, patient_info)

        return jsonify({
            'label': label,
            'probability': prob,
            'confidence': confidence,
            'severity': patient_info.get("severity"),
            'report': diagnosis_report,
            'patient_info': patient_info,
            'status': 'success'
        })
    except Exception as e:
        print(f"Prediction error: {str(e)}")
        return jsonify({'error': f'Prediction failed: {str(e)}'}), 500

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({
        'status': 'healthy',
        'model_loaded': model is not None,
        'model_path': MODEL_PATH,
        'expected_input_size': IMAGE_SIZE,
        'tensorflow_version': tf.__version__
    })

@app.route('/reload-model', methods=['POST'])
def reload_model():
    global model
    try:
        print("Reloading model from local folder...")
        model = load_model_from_local()
        return jsonify({
            'status': 'success',
            'message': 'Model reloaded successfully from local folder'
        })
    except Exception as e:
        print(f"Model reload error: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': f'Failed to reload model: {str(e)}'
        }), 500

@app.route('/', methods=['GET'])
def home():
    return jsonify({
        'message': 'Pneumonia Detection API',
        'status': 'running',
        'endpoints': {
            '/predict': 'POST - Upload chest X-ray for pneumonia detection',
            '/health': 'GET - Check API health status',
            '/reload-model': 'POST - Reload model from local folder'
        }
    })

@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Endpoint not found'}), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({'error': 'Internal server error'}), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    print("Starting Flask server...")
    print("API endpoints:")
    print("- POST /predict: Upload chest X-ray image")
    print("- GET /health: Check API status")
    print("- POST /reload-model: Reload model from local folder")
    print("- GET /: API information")
    print(f"Server running on http://0.0.0.0:{port}")
    
    # Use environment variable for debug mode (default to False in production)
    debug_mode = os.environ.get('FLASK_ENV') == 'development' or os.environ.get('DEBUG') == 'True'
    app.run(host='0.0.0.0', port=port, debug=debug_mode)
