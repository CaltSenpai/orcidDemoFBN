require('dotenv').config();
const express = require('express');
const axios = require('axios');
const path = require('path');
const jwt = require('jsonwebtoken');
const { write } = require('fs');

const app = express();

const ORCID_BASE_URL = process.env.ORCID_BASE_URL; 
const CLIENT_ID = process.env.ORCID_CLIENT_ID;
const CLIENT_SECRET = process.env.ORCID_CLIENT_SECRET;
const REDIRECT_URI = process.env.ORCID_REDIRECT_URI;
const JWT_SECRET = process.env.JWT_SECRET;

app.use(express.static(path.join(__dirname, 'public')));

app.get('/login', (req, res) => {
  const authUrl = `${ORCID_BASE_URL}/oauth/authorize?client_id=${CLIENT_ID}&response_type=code&scope=/authenticate&redirect_uri=${REDIRECT_URI}`;
  res.redirect(authUrl);
});

app.get('/callback', async (req, res) => {
  const { code } = req.query;

  if (!code) {
    return res.status(400).send('Authorization code not provided');
  }

  try {
    // Exchange authorization code for access token
    const tokenResponse = await axios.post(`${ORCID_BASE_URL}/oauth/token`, null, {
      params: {
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: REDIRECT_URI,
      },
      headers: {
          'Accept': 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded'

      },
    });



    const { access_token, orcid, name } = tokenResponse.data;


    let userName = 'Not provided';
    if (name) {
      
      const givenName = name['given-names']?.value ;
      const familyName = name['family-name']?.value ;
      userName = `${givenName} ${familyName}`.trim();
    }

    // Send data to the success page
    res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <link rel="stylesheet" href="success.css">
        <title>Success</title>
      </head>
      <body>
        <h1>Welcome, ${name}!</h1>
        <p><strong>ORCID iD:</strong> ${orcid}</p>
        <button id="logout-button">Logout</button>
      </body>
        <script>
    document.getElementById("logout-button").addEventListener("click", function () {

    // Clear localStorage and sessionStorage
    localStorage.clear();
    sessionStorage.clear();

    // Redirect to a logout route or login page
    window.location.href = "index.html"; // Change to your login page or endpoint
});
  </script>
      </html>
    `);
  } catch (error) {
    console.error(error.response?.data || error.message);
    res.status(500).send('An error occurred during the login process.');
  }
});

app.listen(3000, () => {
  console.log('Server is running on http://localhost:3000');
});

