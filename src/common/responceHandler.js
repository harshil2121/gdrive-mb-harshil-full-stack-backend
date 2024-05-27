module.exports.successResponse = (res, status, message, data) => {
  res.status(status).send({
    success: true,
    message,
    data,
  });
};

module.exports.errorResponse = (res, status, message, error) => {
  res.status(status).send({
    success: false,
    message,
    error,
  });
};
