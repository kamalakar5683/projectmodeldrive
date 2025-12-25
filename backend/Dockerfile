# Use an official Python runtime as a parent image
# 3.10-slim is a good balance of size and compatibility for TensorFlow
FROM python:3.10-slim

# Set the working directory in the container
WORKDIR /app

# Install system dependencies
# libgl1-mesa-glx and libglib2.0-0 are often needed for cv2/pillow operations
RUN apt-get update && apt-get install -y \
    libgl1-mesa-glx \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Copy the requirements file into the container at /app
COPY requirements.txt .

# Install any needed packages specified in requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the backend code
COPY . .

# Expose port 5000
EXPOSE 5000

# Define environment variable for production
ENV FLASK_ENV=production

# Run gunicorn when the container launches
CMD ["gunicorn", "-w", "4", "-b", "0.0.0.0:5000", "app:app"]
