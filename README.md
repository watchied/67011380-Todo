Must install these:
- react ver 18.3.1
install in backend:
- npm install multer
- npm install bcrypt
- npm install axios
- npm install google-auth-library
install in frontend:
- npm install @react-oauth/google
- npm install react-google-recaptcha
- npm install react-icons/fi
- npm install jwt-decode
database:
# change char var in table todo to 50
ALTER TABLE todo 
MODIFY username VARCHAR(50) NOT NULL;`
# create table users
