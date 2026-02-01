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
CREATE TABLE `users` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `full_name` varchar(100) NOT NULL,
  `username` varchar(50) NOT NULL,
  `password` varchar(255) NOT NULL,
  `profile_image` varchar(255) DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;