import "dotenv/config";

const PORT = process.env.PORT || 3000;
const URL_MONGODB = process.env.URL_MONGODB || "" ;
const EMAIL_ADMIN = process.env.EMAIL_ADMIN || "" ;
const PASSWORD_ADMIN = process.env.PASSWORD_ADMIN || "" ;
const SECRET_KEY = process.env.SECRET_KEY;
const CLOUDINARY_NAME = process.env.CLOUDINARY_NAME
const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY;
const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET;

export {
    PORT,
    URL_MONGODB,
    EMAIL_ADMIN,
    PASSWORD_ADMIN,
    SECRET_KEY,
    CLOUDINARY_NAME,
    CLOUDINARY_API_KEY,
    CLOUDINARY_API_SECRET,
}
