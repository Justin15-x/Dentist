'use strict';

const { validationResult } = require('express-validator');

/**
 * Reads express-validator results and short-circuits the request
 * with a 422 response if any validation errors exist.
 * Place after validation chain arrays in route definitions.
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(422).json({
      success: false,
      message: 'Error de validación en los datos enviados.',
      errors:  errors.array().map((e) => ({
        campo:   e.path,
        mensaje: e.msg,
      })),
    });
  }

  next();
};

module.exports = { validate };
