const { body, validationResult } = require("express-validator");
const userService = require("../service/userServices");
const MessageConstant = require("../common/massageConstant");
const responseHandler = require("../common/responceHandler");

class userController {
  constructor() {}

  async googleLogin(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const data = await userService.googleLogin(req.body, res);

      if (data) {
        return responseHandler.successResponse(
          res,
          200,
          MessageConstant.CREATE_SUCCESS,
          data
        );
      }
    } catch (error) {
      return responseHandler.errorResponse(
        res,
        400,
        MessageConstant.SOMETHING_WRONG,
        error.message
      );
    }
  }

  async googleCallBack(req, res) {
    try {
      const files = await userService.googleCallBack(req, res);

      const analytics = await userService.analyzeFiles(files.driveFiles);

      if (analytics) {
        return responseHandler.successResponse(
          res,
          200,
          MessageConstant.CREATE_SUCCESS,
          { analytics, user: files.user }
        );
      }
    } catch (error) {
      return responseHandler.errorResponse(
        res,
        400,
        MessageConstant.SOMETHING_WRONG,
        error.message
      );
    }
  }

  async googleRevokeAccess(req, res) {
    try {
      const data = await userService.googleRevokeAccess(req.body, res);

      if (data) {
        return responseHandler.successResponse(
          res,
          200,
          MessageConstant.CREATE_SUCCESS,
          data
        );
      }
    } catch (error) {
      return responseHandler.errorResponse(
        res,
        400,
        MessageConstant.SOMETHING_WRONG,
        error.message
      );
    }
  }

  // Define your validation rules here
  static validate(method) {
    switch (method) {
      case "googleLogin": {
        return [
          body("first_name")
            .notEmpty()
            .withMessage("Please enter first name.")
            .matches(/^[a-zA-Z][a-zA-Z0-9 ]*$/)
            .withMessage("Please enter a valid first name."),
          body("last_name")
            .notEmpty()
            .withMessage("Please enter last name.")
            .matches(/^[a-zA-Z][a-zA-Z0-9 ]*$/)
            .withMessage("Please enter a valid last name."),
          body("email")
            .notEmpty()
            .withMessage("Please enter email.")
            .isEmail("Please enter a valid email."),
          body("jobtitle")
            .notEmpty()
            .withMessage("Please enter job title.")
            .matches(/^[a-zA-Z][a-zA-Z0-9 ]*$/)
            .withMessage("Please enter a valid job title."),
          body("company_name")
            .notEmpty()
            .withMessage("Please enter company name.")
            .matches(/^[a-zA-Z][a-zA-Z0-9 ]*$/)
            .withMessage("Please enter a valid company name."),
          body("country")
            .notEmpty()
            .withMessage("Please enter country or region.")
            .matches(/^[a-zA-Z][a-zA-Z0-9 ]*$/)
            .withMessage("Please enter a valid first name."),
        ];
      }
      // Add validation rules for other methods if needed
      default:
        return [];
    }
  }
}
module.exports = new userController();
