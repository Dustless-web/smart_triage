from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import tempfile
# Import the simulation function you built in the last step
from engine import run_simulation 

app = Flask(__name__)
# Enable CORS so your Vite frontend (running on a different port) can talk to this API
CORS(app) 
@app.route('/', methods=['GET'])
def health_check():
    return jsonify({
        "status": "online", 
        "message": "SmartTriage API is running! Send a CSV file via POST to /api/simulate"
    }), 200

@app.route('/api/simulate', methods=['POST'])
def simulate():
    # 1. Check if the file is in the request
    if 'file' not in request.files:
        return jsonify({"error": "No file part in the request"}), 400
    
    file = request.files['file']
    
    if file.filename == '':
        return jsonify({"error": "No file selected"}), 400

    # 2. Save the uploaded CSV to a temporary file
    if file and file.filename.endswith('.csv'):
        # Using tempfile ensures we don't clutter the server with old CSVs
        temp_dir = tempfile.gettempdir()
        temp_path = os.path.join(temp_dir, 'uploaded_patients.csv')
        file.save(temp_path)
        
        try:
            # Check if the UI sent the twist toggle
            twist_active = request.form.get('twist', 'false') == 'true'
            
            # Run the winning algorithm with the twist variable
            result = run_simulation(temp_path, output_json='submission.json', twist_active=twist_active)
            
            return jsonify(result), 200
            
        except Exception as e:
            return jsonify({"error": str(e)}), 500
    else:
        return jsonify({"error": "Invalid file format. Please upload a CSV."}), 400

if __name__ == '__main__':
    # Run on port 5000 by default
    app.run(debug=True, port=5000)