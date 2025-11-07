# pelada-manager

## ⚙️ Build and run locally
### Build the image
docker build -t pelada-manager .

### Run the container
docker run -d -p 5000:5000 \
  -v $(pwd)/data:/app/data \
  pelada-manager

Access the app at:
👉 http://localhost:5000
