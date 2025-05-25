from flask import Flask, render_template, send_from_directory

app = Flask(__name__, template_folder="public", static_folder='public')

@app.route('/')
def index():
    return render_template("index.html")

# # Serve precomputed D3 JSON files
# @app.route('/api/<path:filename>')
# def serve_json_data(filename):
#     return send_from_directory('public/d3_data', filename)

if __name__ == '__main__':
    app.run(debug=True)

