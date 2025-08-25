# Use a slim Python 3.9 base image for smaller size
FROM python:3.9-slim-buster

# Set the working directory in the container
WORKDIR /app

# Copy requirements.txt and install Python dependencies
# Use --no-cache-dir for a smaller image
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy your entire application code into the container
# This copies main.py, config.py, static/ folder, etc.
COPY . .

# Expose the port your Flask app listens on.
# Fly.io needs to know which internal port your web server makes available.
EXPOSE 8080

# Command to run your main.py application when the container starts.
# Your main.py is responsible for starting both the Flask app and the Discord bot.
# Ensure your Flask app listens on 0.0.0.0:${PORT:-8080} inside main.py
CMD python main.py
