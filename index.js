const express = require('express')
const cors = require('cors')
const cookieParser = require('cookie-parser')
require('dotenv').config()
const jwt = require('jsonwebtoken');
const port = process.env.PORT || 5000;