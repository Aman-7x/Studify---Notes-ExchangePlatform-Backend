import { StatusCodes } from "http-status-codes";

export const errorHandler = (err, req, res, next) => {
  const statusCode =
    res.statusCode !== StatusCodes.OK
      ? res.statusCode
      : StatusCodes.INTERNAL_SERVER_ERROR;

  res.status(statusCode);

  const errorResponse = {
    title: "Error",
    message: err.message,
    stackTrace: process.env.NODE_ENV === "development" ? err.stack : null,
  };

  switch (statusCode) {
    case StatusCodes.BAD_REQUEST:
      errorResponse.title = "Validation Error";
      break;
    case StatusCodes.UNAUTHORIZED:
      errorResponse.title = "Unauthorized";
      break;
    case StatusCodes.FORBIDDEN:
      errorResponse.title = "Forbidden";
      break;
    case StatusCodes.NOT_FOUND:
      errorResponse.title = "Not Found";
      break;
    case StatusCodes.CONFLICT:
      errorResponse.title = "Already Exists";
      break;
    case StatusCodes.INTERNAL_SERVER_ERROR:
    default:
      errorResponse.title = "Server Error";
      break;
  }

  res.json(errorResponse);
};
