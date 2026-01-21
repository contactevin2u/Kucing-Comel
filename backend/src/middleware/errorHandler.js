const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  if (err.type === 'validation') {
    return res.status(400).json({
      error: 'Validation Error',
      message: err.message
    });
  }

  if (err.code === '23505') {
    return res.status(409).json({
      error: 'Conflict',
      message: 'Resource already exists.'
    });
  }

  if (err.code === '23503') {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'Referenced resource does not exist.'
    });
  }

  res.status(err.status || 500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong.'
  });
};

module.exports = errorHandler;
