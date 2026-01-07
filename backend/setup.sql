SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+07:00";



CREATE TABLE `todo` (
  `id` int NOT NULL,
  `username` varchar(20) NOT NULL,
  `task` varchar(50) NOT NULL,
  `done` tinyint(1) NOT NULL DEFAULT '0',
  `updated` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


ALTER TABLE `todo`
  ADD PRIMARY KEY (`id`);


ALTER TABLE `todo`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;




INSERT INTO `todo` (`username`, `task`, `done`) VALUES
('cei', 'homework', 0),
('cei', 'teaching', 0);

COMMIT;