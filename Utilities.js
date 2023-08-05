const Joi = require('joi');
const jwt = require('jsonwebtoken');
const secret_key='secret@98';

    // Authentication Middleware
const authenticateToken = (req, res, next) => {
    const token = req.header('Authorization');
    if (!token) return res.sendStatus(401);
  
    jwt.verify(token, secret_key, (err, user) => {
      if (err) return res.sendStatus(403);
      req.user = user;
      next();
    });
  };
  
  // Input Validation Middleware using Joi
  const validateInput = (schema) => (req, res, next) => {
    const { error } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }
    next();
  };
  
  // Define Joi Schema for book resource validation
  const bookSchemaValidation = Joi.object({
    title: Joi.string().required(),
    author: Joi.string().required(),
  });

  module.exports={authenticateToken,validateInput,bookSchemaValidation}