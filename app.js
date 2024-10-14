const express = require('express');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const path = require('path');

const app = express();
const port = 3000;

// ORCID Sandbox API credentials
const clientID = 'APP-ENBXUOGZZDSH32BE';
const clientSecret = '8f9ee169-db63-4f82-9114-a29b25ebf328';
const redirectUri = 'http://127.0.0.1:3000/callback';

// Secret key for JWT
const JWT_SECRET = 'RanDoMJwTs&@rQ€/)';

// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());


// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/login', (req, res) => {
  const authUrl = `https://sandbox.orcid.org/oauth/authorize?client_id=${clientID}&response_type=code&scope=/authenticate&redirect_uri=${redirectUri}`;
  res.redirect(authUrl);
});

app.get('/callback', async (req, res) => {
  const { code } = req.query;
  
  try {
    const tokenResponse = await axios.post('https://sandbox.orcid.org/oauth/token', null, {
      params: {
        client_id: clientID,
        client_secret: clientSecret,
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: redirectUri
      },
      headers: {
        'Accept': 'application/json'
      }
    });


    const { access_token, orcid } = tokenResponse.data;
    
    // Create a JWT
    const token = jwt.sign({ accessToken: access_token, orcid }, JWT_SECRET, { expiresIn: '1h' });
    // Send the JWT to the client
    res.redirect(`/profile.html?token=${token}`);
  } catch (error) {
    console.error('Error during ORCID authentication:', error);
    res.status(500).send('Authentication failed');
  }
});

app.get('/api/profile', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const profileResponse = await axios.get(`https://api.sandbox.orcid.org/v3.0/${decoded.orcid}/record`, {
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${decoded.accessToken}`
      }
    });

    const name = profileResponse.data.person.name;
    res.json({
      name: `${name.given_names.value} ${name.family_name.value}`,
      orcid: decoded.orcid
    });
  } catch (error) {
    console.error('Error fetching ORCID profile:', error);

    res.status(401).json({ error: 'Invalid token' });
  }
});


app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});