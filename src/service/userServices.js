const mongoose = require("mongoose");
const { ObjectId } = mongoose.Types;
const { google } = require("googleapis");
const userModal = require("../modal/userModal");
const MessageConstant = require("../common/massageConstant");
const responseHandler = require("../common/responceHandler");

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI;
const SCOPES = [
  "https://www.googleapis.com/auth/drive",
  // "https://www.googleapis.com/auth/drive.metadata.readonly",
  "https://www.googleapis.com/auth/userinfo.profile",
  "https://www.googleapis.com/auth/userinfo.email",
  // "https://www.googleapis.com/auth/analytics.readonly",
];

const oauth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI
);

class userServices {
  constructor() {}

  async googleLogin(payload, res) {
    try {
      let user = await userModal.findOne({ email: payload.email });

      if (!user) {
        user = new userModal({
          email: payload.email,
          first_name: payload.first_name,
          last_name: payload.last_name,
          jobtitle: payload.jobtitle,
          country: payload.country,
          company_name: payload.company_name,
          phone: payload.phone,
        });

        await user.save();
      }

      const authUrl = oauth2Client.generateAuthUrl({
        access_type: "offline",
        scope: SCOPES,
        include_granted_scopes: true,
        response_type: "code",
        prompt: "consent",
      });
      return authUrl;
    } catch (error) {
      throw new Error(error);
    }
  }

  async googleCallBack(req, res) {
    try {
      let token_Session;
      if (req.session.tokens) {
        token_Session = req.session.tokens;
        oauth2Client.setCredentials(req.session.tokens); // Set credentials directly here
      } else {
        // If tokens are not present, proceed with OAuth flow
        const code = req.query.code;
        const { tokens } = await oauth2Client.getToken(code);
        oauth2Client.setCredentials(tokens);
        // Store tokens in session
        req.session.tokens = tokens;
        token_Session = tokens;
      }

      const oauth2 = google.oauth2({
        version: "v2",
        auth: oauth2Client,
      });

      const userInfo = await oauth2.userinfo.get();

      let user = await userModal.findOne({ email: userInfo.data.email });

      if (!user) {
        user = new userModal({
          googleId: userInfo.data.id,
          token: token_Session.access_token, // Access tokens directly from token_Session
          refreshToken: token_Session.refresh_token,
          email: userInfo.data.email,
          first_name: userInfo.data.given_name,
          last_name: userInfo.data.family_name,
        });
      } else {
        user.token = token_Session.access_token; // Access tokens directly from token_Session
        user.refreshToken = token_Session.refresh_token;
        user.googleId = userInfo.data.id;
      }

      await user.save();

      const drive = google.drive({
        version: "v3",
        auth: oauth2Client,
      });

      const response = await drive.files.list({
        pageSize: 1000,
        fields: "nextPageToken, files(*)",
      });

      return { user, driveFiles: response.data.files };
    } catch (error) {
      console.error("Google callback error:", error);
      throw new Error(error);
    }
  }

  async analyzeFiles(files) {
    try {
      const analytics = {
        publiclyAccessibleFiles: [],
        peopleWithAccess: [],
        filesSharedExternally: [],
        totalRiskScore: 0,
      };

      await Promise.all(
        files.map(async (file) => {
          let riskScore = 0;
          const accessSetting = file.shared
            ? file.ownedByMe
              ? "external"
              : "public"
            : "private";
          const sharedWithPeople = file.permissions
            ? file.permissions.map((p) => p.emailAddress)
            : [];
          const sharedWithCount = sharedWithPeople.length;

          if (accessSetting === "public") {
            riskScore += 50;
          }

          if (accessSetting === "external") {
            riskScore += 30;
          }

          riskScore += sharedWithCount * 2;

          analytics.totalRiskScore += riskScore;
        })
      );

      const totalRiskScore = analytics.totalRiskScore;

      await Promise.all(
        files.map(async (file) => {
          const createdByUser = file.owners[0];

          let riskScore = 0;
          const accessSetting = file.shared
            ? file.ownedByMe
              ? "external"
              : "public"
            : "private";
          const sharedWithPeople = file.permissions
            ? file.permissions.map((p) => p.emailAddress)
            : [];
          const sharedWithCount = sharedWithPeople.length;

          if (accessSetting === "public") {
            riskScore += 50;
            analytics.publiclyAccessibleFiles.push({
              fileName: file.name,
              createdBy: createdByUser,
              sharedWithCount: sharedWithCount,
              fileType: file.mimeType,
              size: file.size,
              permissions: file.permissions,
              riskScore: ((riskScore / totalRiskScore) * 100).toFixed(2),
            });
          }

          if (accessSetting === "external") {
            riskScore += 30;
            analytics.filesSharedExternally.push({
              fileName: file.name,
              createdBy: createdByUser,
              sharedWithCount: sharedWithCount,
              fileType: file.mimeType,
              size: file.size,
              permissions: file.permissions,
              riskScore: ((riskScore / totalRiskScore) * 100).toFixed(2),
            });
          }

          riskScore += sharedWithCount * 2;

          sharedWithPeople.forEach((user) => {
            const existingUser = analytics.peopleWithAccess.find(
              (u) => u.email === user
            );
            if (!existingUser) {
              analytics.peopleWithAccess.push({
                email: user,
                count: 1,
                files: [
                  {
                    fileName: file.name,
                    createdBy: createdByUser,
                    sharedWithCount: sharedWithCount,
                    fileType: file.mimeType,
                    size: file.size,
                    permissions: file.permissions,
                    riskScore: ((riskScore / totalRiskScore) * 100).toFixed(2),
                  },
                ],
              });
            } else {
              existingUser.count += 1;
              existingUser.files.push({
                fileName: file.name,
                createdBy: createdByUser,
                sharedWithCount: sharedWithCount,
                fileType: file.mimeType,
                size: file.size,
                permissions: file.permissions,
                riskScore: ((riskScore / totalRiskScore) * 100).toFixed(2),
              });
            }
          });
        })
      );

      return analytics;
    } catch (error) {
      throw new Error(error);
    }
  }

  async googleRevokeAccess(payload) {
    try {
      let revokeUser = await oauth2Client.revokeToken(payload.token);

      return revokeUser;
    } catch (error) {
      throw new Error(error);
    }
  }
}

module.exports = new userServices();
