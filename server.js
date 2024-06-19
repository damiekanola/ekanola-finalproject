  const express = require('express');
  const multer = require('multer');
  const fetch = require('node-fetch');
  const app = express();
  const ffmpeg = require('fluent-ffmpeg');
  const fs = require('fs');
  const { loadGraphModel } = require('@tensorflow/tfjs-converter');
  const port = 6000;

  // Middleware to parse JSON data
  app.use(express.json());
  const upload = multer({ dest: 'uploads/' });

  // let model;
  // (async () => {
  //   model = await tf.loadGraphModel('file://models/wake_word.tflite');
  // })();
  const convertToFlac = (inputPath, outputPath) => {
    return new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .toFormat('flac')
        .on('end', () => resolve(outputPath))
        .on('error', (err) => reject(err))
        .save(outputPath);
    });
  };

  app.post('/upload', upload.single('audio'), async (req, res) => {
      try {
        // Read the contents of the uploaded file
        if (!req.file) {
          return res.status(400).send('No file uploaded');
        }
        console.log('Audio file uploaded:', req.file.filename);

        const inputFilePath = req.file.path;
        const outputFilePath = `${inputFilePath}.flac`;

        await convertToFlac(inputFilePath, outputFilePath);
        const flacData = fs.readFileSync(outputFilePath);


        // const model = await loadGraphModel('file://models/wake_word.tflite')

        // const wavData = fs.readFileSync(inputFilePath);
        // const decoded = wav.decode(wavData);
        // const audioTensor = tf.tensor(decoded.channelData);
        // const prediction = model.predict(audioTensor);
        // const predictionResult = await prediction.array();
    
        // Send the audio data to the Hugging Face API
        const hfResult = await sendAudioToAPI(flacData);
    
        // Send the response back to the client
        res.json({
          // tfLitePrediction: predictionResult,
          huggingFaceResult: hfResult,
        });
      } catch (error) {
        console.error('Error handling audio upload:', error);
        res.status(500).send('Failed to handle audio upload');
      } finally {
        // Clean up the uploaded file
        if (req.file && req.file.path) {
          fs.unlink(req.file.path, (err) => {
            if (err) console.error('Error deleting file:', err);
          });
        }
        const outputFilePath = `${req.file.path}.flac`;
        if (fs.existsSync(outputFilePath)) {
        fs.unlink(outputFilePath, (err) => {
          if (err) console.error('Error deleting converted file:', err);
        });
      }
      }
    });

    const sendAudioToAPI = async (data) => {
      try {
        const response = await fetch(
          'https://api-inference.huggingface.co/models/neoform-ai/whisper-medium-yoruba',
          {
            headers: {
              Authorization: "Bearer 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",
            },
            method: 'POST',
            body: data, // Send the file data directly
          }
        );
        const result = await response.json();
        return result;
      } catch (error) {
        console.error('Error sending audio to API:', error);
        throw error; // Rethrow the error for handling in the route handler
      }
    };

    app.listen(port, () => {
      console.log(`Server is running on port ${port}`);
    });
    