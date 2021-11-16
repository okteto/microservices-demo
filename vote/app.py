from flask import Flask, render_template, request, make_response, g
from kafka import KafkaProducer
import os
import socket
import random
import json
import logging
import traceback


option_a = os.getenv('OPTION_A', "Cats")
option_b = os.getenv('OPTION_B', "Dogs")
hostname = socket.gethostname()

app = Flask(__name__)

gunicorn_error_logger = logging.getLogger('gunicorn.error')
app.logger.handlers.extend(gunicorn_error_logger.handlers)
app.logger.setLevel(logging.INFO)

def get_kafka():
    if not hasattr(g, 'kafka'):
        g.kafka = KafkaProducer(bootstrap_servers='kafka:9092')
    return g.kafka

@app.route("/", methods=['POST','GET'])
def hello():
    voter_id = request.cookies.get('voter_id')
    if not voter_id:
        voter_id = hex(random.getrandbits(64))[2:-1]
    vote = None

    if request.method == 'POST':
        kafkaClient = get_kafka()
        vote = request.form['vote']
        app.logger.info('Received vote for %s', vote)
        kafkaClient.send('votes', key=str.encode(voter_id), value=str.encode(vote))

    resp = make_response(render_template(
        'index.html',
        option_a=option_a,
        option_b=option_b,
        hostname=hostname,
        vote=vote,
    ))
    resp.set_cookie('voter_id', voter_id)
    return resp


if __name__ == "__main__":
    app.run(host='0.0.0.0', port=80, debug=True, threaded=True)
