// One-time reconciliation of the `members` collection against the official
// PAHA directory list supplied by the association (2026-07-13).
//
// Auth: reuses the machine's existing `firebase login` session (the same
// owner credentials used for `firebase deploy`) by exchanging its stored
// refresh token for a short-lived access token in memory. No tokens are
// ever printed or written to disk.
//
// Behavior: updates mismatched fields on matched members, creates members
// missing from the database, NEVER deletes anything. Prints a summary.

import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const PROJECT_ID = 'paha-db';
// Public OAuth client constants of the open-source Firebase CLI (not secrets).
const FIREBASE_CLI_CLIENT_ID = '563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com';
const FIREBASE_CLI_CLIENT_SECRET = 'j9iVZfS8kkCEFUPaAeJV0sAi';

const ACCREDITED = new Set([
    'animal house veterinary clinic aurora',
    'animal house veterinary clinic makati',
    'animal kingdom veterinary hospital',
    'batinga animal medical center',
    'carlos veterinary clinic',
    'cebu veterinary doctors',
    'celestial s animal clinic',
    'makati dog and cat hospital',
    'peralta veterinary center',
    'seven lakes veterinary clinic',
    'vets in practice animal hospital quezon city',
    'the pet project veterinary clinic',
    'animal practice pet clinic and grooming center',
    'san roque animal clinic',
    'bethlehem animal clinic taytay',
    'pet wonders veterinary clinic',
    'pluma veterinary clinic',
    'wags and whiskers veterinary clinic',
    'bethlehem animal clinic antipolo',
]);

// [institution, representative, address, phone] — verbatim from the official list.
const DIRECTORY = [
    ["3j'S Pet Camp Co. Veterinary Clinic", 'Dr. Juvy Gulinao', '58 Unit 6 Saudi Arabia St, Better Living Subd, Don Bosco, Parañaque City', '09228569081'],
    ['Ace Veterinary Clinic', 'Dr. Marietta Geonzon', '7-A Narra St, Project 3, Quezon City', '09171162733'],
    ['Angeles Pet Care Center', 'Dr. Elizardo V. Reyes', '385-C, MacArthur Highway, Mabalacat, Pampanga', '09228778594'],
    ['Animal Doctors Veterinary Services Corporation', 'Dr. Fernando Reyes / Dr. Janice Nadal', 'Blk. 1 Lot 1, Avenida Rizal St., Bahayang Pagasa, Molino III, Bacoor, Cavite', '09718644564'],
    ['Animal House Veterinary Clinic-Aurora', 'Dr. Cielo Kaw', '737 Aurora Boulevard, Q.C.', '09178396640'],
    ['Animal House Veterinary Clinic-Makati', 'Dr. Edgardo Unson', '22 Jupiter St., Makati City', '09175342169'],
    ['Animal Kingdom Veterinary Hospital', 'Dr. Gaudiosa Berdon', '38 Gorordo Avenue, Camputhaw, Cebu City', '09173201318'],
    ['Animal Life Clinic', 'Dr. Benedick Macaraeg', 'Amado St, Dagupan, 2400 Pangasinan', '09173201319'],
    ['Animal Shelter Veterinary Clinic', 'Dr. Harris Constantino', '1376 Mercedes Ave, Pasig, Metro Manila', '09198289251'],
    ['A-Z Animal Wellness International Veterinary Corp.', 'Dr. Ivy Alvarez-Zialcita', 'Golam Drive, Kasambagan, Cebu City', '09175850560'],
    ['Assisi Veterinary Clinic', 'Dr. Johncar Dela Cruz', '100 G. Castaneda St., Poblacion IV-B, Imus, Cavite', '09985337816'],
    ['Aso, Pusa, Atbp. Animal Shelter and Veterinary Services', 'Dr. Antonio Ramon Bautista', '1 P. Guevara St. cor. Santolan Road, San Juan City', '09209008677'],
    ['Assumpta Dog and Cat Clinic', 'Dr. Oscar Macenas', 'Marville Park Subdivision, Ortigas Ave Ext, Antipolo', '09153403823'],
    ['Pet House Central Veterinary Clinic', 'Dr. Eliezer Dela Cruz', 'Cor. Lacson St. Carlos Hidalgo Highway, Brgy. Banago, Bacolod City', '09177222771'],
    ['Batinga Animal Medical Center', 'Dr. Maysie Batinga', '85 Tiano-Montalvan St., Cagayan De Oro', '09189305916'],
    ['Beterinarya Plus Animal Clinic', 'Dr. Lilibeth Cheng', 'BREB 2 Bldg Unit C #230 M.H. del Pilar St., Santolan, Malabon City', '09173983858'],
    ['Blue Cross Animal Clinic', 'Dr. Efren Dela Cruz', '248 A. Sto Rosario St., San Jose, Angeles City', '09228735025'],
    ['Carlos Veterinary Clinic', 'Dr. Rhodora Carlos', 'Dr. A. Santos Avenue, Parañaque City', '09165796190'],
    ['Casas-Jamis Veterinary Clinic', 'Dr. Lorna Casas-Jamis', '073 Lapasan Highway, Cagayan De Oro City', '09178731958'],
    ['Cebu Veterinary Doctors', 'Dr. Odysseus Camarillo', 'Unit 108-109 Marijoy Building, 306 F. Ramos St., Cebu City', '09176317459'],
    ['Celebrity Pet Veterinary Clinic', 'Dr. Alexandra Cecilia Cortes', '691 E. Old Balara, Tandang Sora, Quezon City', '09285502890'],
    ["Celestial's Animal Clinic", 'Dr. Melany Celestial', 'Door 8 Lua Bldg., McArthur Highway, Matina, Davao City', '09177020552'],
    ['Chua Veterinary Clinic', 'Dr. Elizabeth C. Reyes', '213 Speaker Perez St., Brgy. Maharlika, Quezon City', '09175606616'],
    ['Claws & Paws Veterinary Clinic', 'Dr. Iris Pasco', '1790 Maximo Patalinghug Avenue, Pajo, Lapu-Lapu City, Philippines 6015', '09176317067'],
    ['Congressional Animal Clinic', 'Dr. Arturo Echalar', '28 Congressional Ave, Project 8, Bago Bantay, Quezon City, 1106 Metro Manila', '09173456987'],
    ['Dagupan Animal Clinic', 'Dr. David De Los Trinos', '1765 Dagupan St., Tondo, Manila', '09226583503'],
    ['De La Salle Araneta University Veterinary Teaching Hospital', 'Dr. Manuel Paulo Granadozin Jr.', 'Don Salvador Araneta Campus, Victoneta Avenue, Potrero, Malabon', '09266786886'],
    ["Dogs N' Us Pet Supplies and Vet Clinic, Inc.", 'Dr. Olivia Inocencio', '50 Unit C-D Kanlaon St., Quezon City', '09174097014'],
    ["Dog's Land Veterinary Clinic", 'Dr. Uldarico Astada III', '485 Mayon St., Brgy. Salvacion, Quezon City', '09202004570'],
    ["D'Saints Veterinary Corner", 'Dr. Joy Santos', 'Paseo 5, Paseo de Santa Rosa, Greenfield City, Sta. Rosa, Laguna', '09175411350'],
    ['E.V. Dog and Cat Clinic', 'Dr. Marcelo Evangelista', '16 Marcos Alvarez Ave., Talon 5, Las Piñas City', '091762335949'],
    ['Eastern Veterinarians Dog and Cat Clinic', 'Dr. Johdel S. Ty', '231 Sta Cruz St., Brgy. 44, Quarry District, Tacloban City, Leyte', '09173258322'],
    ['Egos Agrivet & Veterinary Clinic', 'Dr. Gerito Egos', '#96 Miguel Parras St., Poblacion 3, Tagbilaran City, Bohol', '09088978756'],
    ['EN Lee Veterinary Clinic', 'Dr. Expedito Lee', '118 Armstrong Ave., Moonwalk, Parañaque City', '90175418374'],
    ['ES General Veterinary Clinic', 'Dr. Eric Sarmiento', '450 P. Guevarra St. cor. Wilson St., San Juan', '09209090753'],
    ['ESC Veterinary Clinic', 'Dr. Edith Dela Cruz', '62-B Lalaine Benette St., BF Resort Village, Las Piñas', '09178567902'],
    ['Fil-Chinese Group of Animal Clinic', 'Dr. Lorenzo Lim', '1316 Benavidez St., Sta Cruz, Manila', '09998813848'],
    ['Goodshepherd Veterinary Clinic', 'Dr. Lailanie Quiben-Parica', 'BHJ Building, San Mateo Road, Aurora, Alicia, Isabela', '09171171293 / 09178675602'],
    ['Greenwoods Pet Hospital', 'Dr. Geoffrey Marl Carullo', 'Deedee & Lou Building, Lot 3, Blk 4, Greenwoods Avenue, Greenwoods Executive Village, Cainta, 1900 Metro Manila', '09209163248'],
    ['Hayop Kalinga Veterinary Clinic and Poultry Supply', 'Dr. Andrew Bernardo', 'Center Stall No. 2, Crossing Plaza, Brgy. Uno, Calamba, Laguna', '09213824868'],
    ['The House of Pets Vet Clinic', 'Dr. Karen Ubana', '136 Katipunan Ave. St., St. Ignatius Village, Quezon City', '09209115675'],
    ['Isabela Animates Veterinary Clinic', 'Dr. Charlie Foronda', '115 Maharlika Hiway, District 2, Cauayan City', '09228840999 / 0917-565-7536'],
    ['Jacobe Veterinary Clinic', 'Dr. Joel Jacobe', '7227 Marcelo Ave., Marcelo Green Village, Parañaque City', '09478932305'],
    ['Jose Abad Santos Veterinary Clinic', 'Dr. Emna Monsanto', '1938 Jose Abad Santos Avenue, Tondo, Manila', '0917 552 1069'],
    ['Lajarca Veterinary Clinic', 'Dr. Lorna Lajarca', 'Esteban Mayo St., Lipa City, Batangas', ''],
    ['Makati Dog And Cat Hospital', 'Dr. Sixto Enrique Carlos', '5426 Gen. Luna corner Algier St., Poblacion, Makati City', '09088967114'],
    ['Marikina Veterinary Clinic', 'Dr. Manuel Carlos', '236-D A. Bonifacio Ave., Brgy. Jesus dela Peña, Marikina City', '09204123577'],
    ['Martinez Veterinary Clinic', 'Dr. Alex Martinez', '8 Colombus St., Vista Verde, Cainta, Rizal', '0917 867 6037'],
    ['Naguilian Veterinary Clinic', 'Dr. Juneleen Samaniego', '54 Naguilian Rd., Campo Filipino, Baguio City', '09778368000'],
    ['NE Veterinary Clinic', 'Dr. Melanie Pascua', '634 Ortiz Bldg, Sangitan East, Cabanatuan City, Nueva Ecija', '09178746985'],
    ['Oltier Veterinary Hospital', 'Dr. Nicole Ole', 'Felix Avenue, Gate 1 Karangalan Village, Cainta, Rizal', '09178991179'],
    ['Ormanes Veterinary Clinic', 'Dr. Perlita Ordoña', '18 Carolyn Masibay St., BF Resort Village, Las Piñas City', '09209106179'],
    ['P & B Horseshoe Pet Clinic-Main', 'Dr. Cristina Paz / Dr. Gabriel Paz', 'Esteban Abada St, Quezon City, 1800 Metro Manila', '09286381541'],
    ['Palanyag Animal Clinic', 'Dr. Basil Siervo', '33 Doña Soledad Ave. corner Bolivia St., Better Living Subdivision, Parañaque', '(02) 8823 7227'],
    ['Palawan Animal Health Center', 'Dr. Patria Ortega', 'Pediapco Bldg., National Highway, Brgy. San Pedro, Puerto Princesa City', '09175830421'],
    ['Peralta Veterinary Center', 'Dr. Juan Carlo Peralta', 'Unit 1 GF JEL Plaza, Doña Soledad Ave. Ext, Parañaque City', '09088124514'],
    ['Pet House Pet Clinic and Grooming Center', 'Dr. Rachel Fernandez', 'UGF 15-D Esteban Abada St., Builtmor Tower, Loyola Heights, Quezon City', '09209604643'],
    ['Pet Bureaux Animal Clinic', 'Dr. Jerry Hawson / Dr. Nathaniel Cheng', '185-A Del Monte Avenue, Manresa, Quezon City', '09178308638'],
    ['Pets First Veterinary Clinic', 'Dr. Joanna Mercader', 'Merco Compound, JP Cabaguio Avenue, Davao City', '09209633387'],
    ['Petropolis Animal Clinic', 'Dr. Keith Dela Cruz', 'Ground Floor, Building D, Ayala Malls Solenad 3, Nuvali, Santa Rosa, 4026 Laguna', '09088617668'],
    ['PLACES (Pet Lovers Animal Center and Emergency Services)', 'Dr. May Rulibeth Javier', '76 Visayas Ave., Quezon City', '09178316826'],
    ['Rebadulla Animal Care Hospital', 'Dr. Marcellus Rebadulla', '88 Commission Civil St, Jaro, Iloilo City, 5000 Iloilo', '09335083401'],
    ['Regalado Veterinary Medical Center', 'Dr. Jhufel Fernandez', '57 Regalado Ave. Extension, West Fairview, Quezon City', '09493509102'],
    ['Sagittarius Veterinary Clinic', 'Dr. Enrico Samson', '8-A Doña Prieto St., San Roque, Marikina City', '09209164143'],
    ['Seven Lakes Veterinary Clinic', 'Dr. Anselma Mariño', 'Colago Ave., Brgy. 1-A, San Pablo City, Laguna', '09175531788'],
    ['SF Pet City Veterinary Clinic', 'Dr. Consuelo Razon', 'Era Zone Square, San Isidro, San Fernando, Pampanga', '0906 680 3214'],
    ['Sicam Veterinary Clinic', 'Dr. Lorna Sicam / Dr. Vicente Sicam', '67 K-1st St., Kamuning, Quezon City', '(02) 8928 2853'],
    ['Southwestern University Vet. Teaching Hospital', 'Dr. Rachel Po', 'Urgello St, Cebu City', '(032) 415 5681'],
    ['St. Joseph Veterinary Clinic and Supplies', 'Dr. Leonarda Belchez', '185 Aguirre Ave, PH2, Parañaque City', '09173271138'],
    ['Tapales Veterinary Clinic', 'Dr. Reynaldo Tapales', '399 Heurvana St., La Paz, Iloilo', '09237239501'],
    ['United Doctors Animal Clinic', 'Dr. Arminda C. Ruma', 'RVMS Bldg Unit 1-C, Maharlika Hway corner Baptista Village, Villasis, Santiago City', '09175030412'],
    ['Valerio Veterinary Clinic', 'Dr. Menandro Valerio', '13 P. Burgos St., Concepcion, Malabon City', ''],
    ['Vetline Animal Clinic and Petshop', 'Dr. Michelle Tulabut', 'Friendship Highway, Brgy. Anunas, Korean Town, Angeles City', '0922 856 9085'],
    ['Vets In Practice Animal Hospital Quezon City', 'Dr. Nicholas G. Carpio / Dr. Nielsen Donato', '220 C5 Katipunan Ave, Project 4, Quezon City, 1109 Metro Manila', '09178879876'],
    ['Vets in Practice Animal Hospital Mandaluyong City', 'Dr. Nielsen Donato', '63 Maysilo Circle corner Boni Avenue, Mandaluyong City', '09188366286'],
    ['Waltac Veterinary Clinic', 'Dr. Anton Mari Lim', 'Unit 4 Dian Hap Building, F. Nuñez St., Zamboanga City', '09177113287'],
    ['YCC Calamba Veterinary Clinic & Pet Supply', 'Dr. Yolanda Casao', "Nat'l Hiway, Brgy. Parian, Calamba, Laguna", '09983462532'],
    ['YGY Animal Clinic', 'Dr. Jaime Yatco / Dr. Genelyn Yatco', '4 Benita Laurel St., Brgy. 2, Tanauan City, Batangas', '09175501028'],
    ['Holy Spirit Animal Clinic', 'Dr. Ma. Solidad Salaver', '62 Holy Spirit Drive, Brgy. Holy Spirit, Quezon City', '09087098516'],
    ['Iligan Dog and Cat Doctor Animal Clinical Center', 'Dr. Miguel Cabreros', '17 Fortaleza St., Poblacion, Iligan City', '09177150994'],
    ['JM Padrinao Animal Clinic', 'Dr. Juanito Padrinao / Dr. Mitzi Padrinao', '3-C Magsaysay St., Doña Ata Subdivision, Marulas, Valenzuela', '09178426261'],
    ['St. Hyacinth Animal Clinic', 'Dr. Luchi Sorilla-Orlanda', "Unit 4 Town & Country Comm'l Arcade, Marcos Highway, Cainta, Rizal", '09178085693'],
    ['Synervet Animal Clinic and Veterinary Supplies - Gapan', 'Dr. Niña Sayson', 'E. Liwag St., San Lorenzo, Gapan City', '0939 927 3782'],
    ['The Pet Project Veterinary Clinic', 'Dr. Melanie Pelayo / Dr. Rizalina Zunio', '16 Regidor St., Brgy. Tibagan, San Juan City', '09255719350'],
    ['Animal Practice Pet Clinic and Grooming Center', 'Dr. Jo-Ann Hachuela', 'Unit 15 & 16 L.B. Daceva Bldg, Mabuhay Road, City Heights, General Santos City', '0328606442 / 09228843834'],
    ['PETS! Animal Clinic', 'Dr. Christine Lillian Duque', 'Balzain Hi-way, Centro 11, Tuguegarao City', '09175781330'],
    ['CDO Pet Doctor', 'Dr. Mary Ann Canoy', 'Apitong St., Crossing Macanhan, Carmen, Cagayan de Oro', '0917-7942319'],
    ['Pets in The City Veterinary Center, OPC', 'Dr. Daisy Jane Rosales', 'Unit 23 Upper Ground Floor, Talamban Times Square, Gov. M. Cuenco Ave., Cebu City', '09173180632'],
    ["Dok Onat's Veterinary Clinic", 'Dr. Ronald Castillo', 'Door 3 JGL Bldg, Diversion Rd., Pengue-Ruyu, Tuguegarao City', '0917 309 5119'],
    ['San Roque Animal Clinic', 'Dr. Nemesio Rynel Esguerra / Dr. Genalyn Esguerra', 'P. Nellas St, Poblacion 3, Carcar City, Cebu', '09171870557'],
    ['Bethlehem Animal Clinic - Taytay', 'Dr. Voltaire Belen / Dr. Sheryl Belen', 'Km23 Ortigas Avenue Extension, Unit C, MRCJ Bldg, Cielito Homes Subdivision, Brgy. San Isidro, Taytay, Rizal', '+639171023043'],
    ['Kalb-Qitta Veterinary Clinic-Pet Salon', 'Dr. Ernesto Coloyan', '96 G/F Bigfoot Bldg, Bypass Road, Sta. Clara, Sta. Maria, Bulacan', '09420280266'],
    ['Saver Petland Animal Clinic', 'Dr. Anielou Yu', '38 J. Catolico Ave, General Santos City', '09128282100'],
    ['Vet Lane Animal Clinic', 'Dr. Marivel Ballog-Abaya', '#9 New York St. cor. E. Rodriguez Sr. Ave, Brgy. Pinagkaisahan, Quezon City', '09158057140'],
    ['Nomar Animal Clinic', 'Dr. Ilonah Marga Jabonete', '1984 S.H. Loyola corner Maceda, Brgy. 523, Sampaloc, Manila City', '09171522321'],
    ['Shambala Veterinary Clinic', 'Dr. Maricel Garcia', '523-C Hernan Cortes St., Subangdaku, Mandaue City, Cebu', '09228961457'],
    ['Pets United Veterinary Clinic', 'Dr. Ian Jagmis', 'South National Highway, Sta. Monica, Puerto Princesa City, Palawan', '09174322221'],
    ['P.V. Animal Shelter Veterinary Clinic', 'Dr. Liezl Constantino', '7D Gen. Luna St., Taguig City', '09088980914'],
    ['Animal Station Veterinary Clinic', 'Dr. Melgrace Ann Tejada', '30 Katipunan Ave, Quezon City, 1110 Metro Manila', '09276631680'],
    ['Central Bark Pet Station and Grooming Services', 'Dr. Maricris Pineda-Alcantara', '8th Acropolis Center, Unit 3, #53 E. Rodriguez Jr. Avenue, Quezon City, Philippines 1400', '09178630722'],
    ['ClinicoVet Animal House', 'Dr. Mark Michael Palazo', 'Brgy. Carlatan, San Fernando City, La Union', '09079411645'],
    ['Pet Wonders Veterinary Clinic', 'Dr. Pretextato Chua III', '8 Old National Highway Nueva, San Pedro City, Laguna', '09175489988'],
    ['Pluma Veterinary Clinic', 'Dr. Amando Pluma', 'Door 18-A and 19-A Gahol Bldg., J.P. Laurel Avenue, Bajada, Davao City', '09177176187'],
    ["Doc Ferd's Animal Wellness Center", 'Dr. Ferdinand Recio', '5 Landsdale Commercial Arcade, Timog Avenue, Quezon City', '09178580911'],
    ['ABH Animal Health Clinic', 'Dr. Aris Hapatinga', 'CFA Building Unit I and II, Calderon, Sta. Ana, Manila', '09258128379'],
    ['Precious Fur Animal Clinic', 'Dr. Dandy Balinggao', '388 ML Quezon St., Bagumbayan, Taguig City', '09399465000'],
    ['Northern Vet Animal Clinic', 'Dr. Maan Joy M. Baldueza', 'Rizal St. cor. Malvar, Poblacion, Manaoag, Pangasinan', '09173117549'],
    ['Petville Animal Clinic', 'Dr. Edgar R. Domingo', 'Crosstown Mall, Brgy. Sta Cruz, Santa Rosa, Laguna', '09209814011'],
    ['Gabieta Veterinary Clinic - Cainta Branch', 'Dr. Gerrico A. Gabieta', 'A. Bonifacio cor. L. Santos St., Cainta, Rizal', '09155797910'],
    ['Gabieta Veterinary Clinic - Angono Branch', 'Dr. Maricris V. Gabieta', 'B1 L19 Quezon Ave, San Martin Subd., San Isidro, Angono, Rizal', '09155797910'],
    ['Laoag Veterinary Clinic', 'Dr. Mary Jane A. Galvez', 'M. Nolasco St., Brgy. 14, Laoag City', '09171108191'],
    ['Pet Family Animal Clinic and Grooming Center', 'Dr. Mary Ann N. Mirasol', 'B4 L6B Greenvillas 2, Buhay na Tubig, Imus, Cavite', '09173227032'],
    ['Manila East Veterinary Care', 'Dr. Lester Louis L. Lopez', '1052 E. Rodriguez Sr. Ave., Brgy. Mariana, New Manila, District 4, Quezon City', '09399107910'],
    ['Wags and Whiskers Veterinary Clinic', 'Dr. Hannah Gay S. Olavidez', '216 Aguinaldo Hwy, Biga 2, Silang, Cavite', '09177139992'],
    ['Pawsome Pets Veterinary Clinic and Supply', 'Dr. Erwinia M. Exciomo', '#54 Rizal Ave., San Carlos City, Pangasinan', '09178511123'],
    ['P-Bee Snoopy and Buddy Veterinary Clinic', 'Dr. Loise Charise C. Set', 'H. Ame cor. P. Montoya St., San Vicente 2, Silang, Cavite', '09185731725'],
    ['The Pet Mobile', 'Dr. Rhoda B. Baquiran', '355 El Grande, BF Homes, Parañaque', '09175750069'],
    ['The Ark Animal Health Veterinary Clinic', 'Dr. Ken Anthony L. Lao', 'Block 2 Lot 24, Joy Street, Cityland Subdivision, Carmona, Cavite', '09257652369'],
    ['Surigao Pet Doctors Animal Hospital', 'Dr. Oriel O. Echavez', 'Echavez Building, Burgos cor. Narciso St., Surigao City', '09364010600'],
    ['Vet Precision Animal Health Centre', 'Dr. John Christopher S. Mangalus', 'Gapan-Olongapo Rd., San Juan Nepomuceno, Betis, Guagua, Pampanga', '045-901-6866 / 09178246458'],
    ['Yandug Animal Care Clinic', 'Dr. Ryan Abelardo S. Yandug III', '8B Nichols Heights, Guadalupe, Cebu City', '09176553337 / (032) 415 4047'],
    ['South Metro Animal Clinic', 'Dr. Rommel Rosauro Q. Orlanda', 'B47 L25A Abel Nosce Street, BF Resort Village, Brgy. Talon Dos, Las Piñas City', '09190963527'],
    ['Synervet Animal Clinic and Veterinary Supplies - Cabanatuan', 'Dr. Nina Sayson', 'Kapitan Pepe Subd., Cabanatuan City', '09338610473'],
    ['St. Vincent Veterinary Clinic', 'Dr. Maricel Bermejo', '135 Carandang St., Poblacion 2, Tanauan City, Batangas', '09338548134 / 7861270'],
    ['Bethlehem Animal Clinic - Antipolo', 'Dr. Voltaire Belen / Dr. Sheryl Belen', 'Unit 1 ACV Bldg., Circumferential Road, Brgy. San Roque', '09688548568'],
    ['South Tails Veterinary Clinic Inc.', 'Dr. Maria Lavinia Perez', 'National Highway, Buntatala, Leganes, Iloilo', '5241011 / 09088828508'],
    ['Petmate Animal Clinic', 'Dr. Judith Gonzales', 'NIA Road, Quel Commercial Building, Carsadang Bago 2, Imus, Cavite', '09321882101'],
    ['Sargado Animal Clinic & Agrivet Supplies', 'Dr. Maevelle Sargado', 'Poblacion, Anilao, Iloilo', '033 331 2822 / 09173232253'],
    ['Vitapets Animal Clinic and Pet Supplies', 'Dr. Kristal Huevos', 'Door 1 & 2 Nabua Bldg, Matina Aplaya Road, Brgy. Matina Crossing, Davao City', '7-007-9323 / 0968-854-8568'],
    ['Petshield Veterinary Clinic', 'Dr. Erwin Pajarillaga', '99 Gen. Espino St. cor. Col. Bravo St., Central Signal Village, Taguig', '0905 457 0190'],
    ['Beterinaryo Sa Fort Animal Clinic', 'Dr. John Jericho Buenviaje', 'Ground Floor, Kensington Place, 1st Ave, Taguig', '0917 144 1598'],
    ['Petvetgo Animal Clinic and Wellness Center', 'Dr. Kristina Belmonte', 'Stall 7 Bldg 1 Plaza de Oro Arcade, J. Luna Extension, Sto. Cristo, Tarlac City, Tarlac', '(045) 925 4440'],
    ['Fabulous Pets Veterinary Centre', 'Dr. Diana Otara-Simpao', 'No 29, Block 3, Libby Road, Puan, Talomo, Davao City, 8000 Davao del Sur', '09163383483'],
    ["Doc Bayani's Animal Wellness Clinic – Main Branch", 'Dr. Bayani Vandenbroeck', '3 1st Floor Orchid Street, Trinidad Greenhills Subd., Ma-a, Talomo District', '09176520047'],
    ["Doc Bayani's Animal Wellness Clinic – Catalunan Branch", 'Dr. Bayani Vandenbroeck', 'Units 1, 2, and 3, Paseo Grande Bldg., Catalunan Grande Road, Catalunan Grande, Davao City', '09176520047'],
    ['Zacarias Animal Clinic', 'Dr. Wilino C. Zacarias', '103 Guiguilonen, Mangaldan, Pangasinan', '09173239225'],
    ['Pet Doctors Veterinary Supplies and Services', 'Dr. Ingrid Abulencia-Valdez', 'Diversion Road, San Miguel, Calasiao, Pangasinan', '09764203764'],
    ['United Care Veterinary Center', 'Dr. Gilson Micor', 'Prime Building, Nancamaliran East, Urdaneta City, Pangasinan', '09151672221'],
    ['JMIC Animal Medical Center', 'Dr. Joyce Marielle Corales', '337 Rizal Ave. Ext., Brgy. 51, West Grace Park, Caloocan City', '09773388860'],
    ['Pet Rx Animal Clinic', 'Dr. Madeleine Elaine Lee', 'McArthur Hiway, Brgy. Caingin, Bocaue, Bulacan', '09228887613'],
    ['Bath and Bark Grooming and Veterinary Services', 'Dr. Rodrigo Faeldo Jr.', 'Zanaya Bldg, Bauan-Batangas Hiway, Sitio Muzon, Poblacion, San Pascual, Batangas', '09267453551'],
    ['Animacare Veterinary Clinic', 'Dr. Marinelle Faeldo', 'Bacay-Rimando Bldg, F. Mangobos St., Sitio Pandayan, Manghinao Proper, Bauan, Batangas', '09171020012'],
    ['Bebita Dog and Cat Clinic', 'Dr. Leo Roberto Bebita', '1005 Captain F. Samano Street, Barangay 175, Camarin, Caloocan City', '09052082246'],
    ['Petvet Jr. Animal Clinic', 'Dr. Russel Tianzon', '490 Quirino Highway, Novaliches, Quezon City', '09178947956'],
    ['Vet 911 Animal Clinic', 'Dr. Charlene Ella Occidental', 'Unit 203, 51 Shorthorn St., Brgy. Bahay Toro, Quezon City 1106', '09265552212'],
    ["Stella's Animal Clinic", 'Dr. Andrea Capistrano', 'Unit 25 Emerald Square, P. Tuazon Blvd, Brgy. Milagrosa, Proj. 4, Quezon City', '09178612362'],
    ['Vets In Practice Animal Hospital - Alabang', 'Dr. Mariel B. Flores', 'A103B G/F One Town Square, The Village Square, La Fuerza Compound, Alabang-Zapote Rd., Almanza Uno, Las Piñas City', '09399375371'],
    ['Pet Purrfect Animal Clinic', 'Dr. Anne Concepcion', 'You We Tong Bldg, Gusa, Cagayan de Oro City', '09171157705'],
    ['Animal Care Specialists Clinic', 'Dr. Margarita Carpio', 'Bldg 6 Pet Village Stall 16 & 17, Tiendesitas Frontera Verde, E. Rodriguez Ave. cor. C5, Ugong, Pasig City', '0929-2856246'],
    ['Pinetown Veterinary Clinic', 'Dr. Christian Ed Alera', 'Prk. Masaya 2, National Highway, Brgy. Poblacion, Polomolok, South Cotabato', '09692141360'],
    ['Animed Veterinary Hospital', 'Dr. Mann Cyron Sarmiento', '753 Quirino Highway, San Bartolome, Novaliches, Quezon City', '09064288766'],
    ['Wagging Tails Veterinary Clinic', 'Dr. Geah del Rio', 'Ramos Building, Purok 2 - Landing, Malaybalay City, Bukidnon', '09171093020'],
    ['Primavera Vetvillage Animal Clinic', 'Dr. Mirabai Primavera', 'Phase 2 Package 2 Block 30 Lot 11 Dutong Street, Brgy. 176, Caloocan City', '09062489488'],
    ['MDD Petcare Animal Clinic', 'Dr. Maybellene Damias', 'Unit 2B Lot 1433 EVR Bldg, Alapan Road, Alapan 1B, Imus, Cavite', '09399135978'],
    ['The Paws Palace Veterinary Clinic', 'Dr. Hyacinth Pugoy', 'Door 10-13 Rowi Square, SumoAsia Hotels Complex, Mamay Road, Lanang, Davao City', '09498898469'],
    ['Pet Avenue Veterinary Clinic', 'Dr. Glaiza Beatriz Rubin', "Stall B, Unit 1 & 2, St. Scholastica's Village Commercial Center, Brgy. Guindapunan, 6501 Palo, Leyte", '09560050151'],
];

const norm = (s) => (s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

async function getAccessToken() {
    const configPath = join(homedir(), '.config', 'configstore', 'firebase-tools.json');
    const config = JSON.parse(readFileSync(configPath, 'utf8'));
    const refreshToken = config?.tokens?.refresh_token;
    if (!refreshToken) throw new Error('No firebase-tools login session found. Run `firebase login` first.');

    const res = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: refreshToken,
            client_id: FIREBASE_CLI_CLIENT_ID,
            client_secret: FIREBASE_CLI_CLIENT_SECRET,
        }),
    });
    if (!res.ok) throw new Error(`Token exchange failed: ${res.status}`);
    const data = await res.json();
    return data.access_token;
}

const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

function fromFirestoreFields(fields = {}) {
    const out = {};
    for (const [k, v] of Object.entries(fields)) {
        if ('stringValue' in v) out[k] = v.stringValue;
        else if ('booleanValue' in v) out[k] = v.booleanValue;
        else if ('integerValue' in v) out[k] = Number(v.integerValue);
        else if ('doubleValue' in v) out[k] = v.doubleValue;
    }
    return out;
}

function toFirestoreFields(obj) {
    const fields = {};
    for (const [k, v] of Object.entries(obj)) {
        if (typeof v === 'boolean') fields[k] = { booleanValue: v };
        else if (typeof v === 'number') fields[k] = { doubleValue: v };
        else fields[k] = { stringValue: String(v) };
    }
    return fields;
}

async function main() {
    const token = await getAccessToken();
    const auth = { Authorization: `Bearer ${token}` };

    // 1. Fetch every member document (paginated)
    const members = [];
    let pageToken = '';
    do {
        const url = `${BASE}/members?pageSize=300${pageToken ? `&pageToken=${pageToken}` : ''}`;
        const res = await fetch(url, { headers: auth });
        if (!res.ok) throw new Error(`List members failed: ${res.status} ${await res.text()}`);
        const data = await res.json();
        for (const docSnap of data.documents || []) {
            members.push({
                id: docSnap.name.split('/').pop(),
                docName: docSnap.name,
                ...fromFirestoreFields(docSnap.fields),
            });
        }
        pageToken = data.nextPageToken || '';
    } while (pageToken);

    console.log(`Fetched ${members.length} existing members from Firestore.`);

    const matchedIds = new Set();
    const fixed = [];
    const added = [];

    for (const [institution, representative, address, phone] of DIRECTORY) {
        const accredited = ACCREDITED.has(norm(institution));
        const member = members.find(m => norm(m.name) === norm(institution));

        if (!member) {
            const body = {
                fields: toFirestoreFields({
                    name: institution,
                    representativeName: representative,
                    headVeterinarian: representative,
                    address,
                    phone,
                    email: '',
                    type: 'Regular',
                    isAccredited: accredited,
                    image: '',
                    joinedAt: new Date().toISOString(),
                    createdAt: new Date().toISOString(),
                }),
            };
            const res = await fetch(`${BASE}/members`, {
                method: 'POST',
                headers: { ...auth, 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            if (!res.ok) {
                console.error(`  ✗ Failed to add "${institution}": ${res.status} ${await res.text()}`);
                continue;
            }
            added.push(institution);
            console.log(`  + Added: ${institution}`);
            continue;
        }

        matchedIds.add(member.id);
        const updates = {};
        const changes = [];

        const currentRep = (member.representativeName || member.headVeterinarian || '').trim();
        if (currentRep !== representative) {
            updates.representativeName = representative;
            updates.headVeterinarian = representative;
            changes.push(`rep: "${currentRep}" -> "${representative}"`);
        }
        if ((member.address || '').trim() !== address) {
            updates.address = address;
            changes.push('address');
        }
        if ((member.phone || '').trim() !== phone) {
            updates.phone = phone;
            changes.push('phone');
        }
        if (!!member.isAccredited !== accredited) {
            updates.isAccredited = accredited;
            changes.push(`accredited: ${!!member.isAccredited} -> ${accredited}`);
        }
        if ((member.name || '') !== institution) {
            updates.name = institution;
            changes.push('name casing/format');
        }

        if (changes.length === 0) continue;

        const mask = Object.keys(updates).map(f => `updateMask.fieldPaths=${encodeURIComponent(f)}`).join('&');
        const res = await fetch(`${BASE}/members/${member.id}?${mask}`, {
            method: 'PATCH',
            headers: { ...auth, 'Content-Type': 'application/json' },
            body: JSON.stringify({ fields: toFirestoreFields(updates) }),
        });
        if (!res.ok) {
            console.error(`  ✗ Failed to update "${institution}": ${res.status} ${await res.text()}`);
            continue;
        }
        fixed.push({ institution, changes });
        console.log(`  ~ Updated: ${institution} [${changes.join('; ')}]`);
    }

    const extras = members.filter(m => !matchedIds.has(m.id)).map(m => m.name || m.id);

    console.log('\n──────── SUMMARY ────────');
    console.log(`Official directory entries : ${DIRECTORY.length}`);
    console.log(`Existing DB members        : ${members.length}`);
    console.log(`Records updated            : ${fixed.length}`);
    console.log(`Records added              : ${added.length}`);
    console.log(`In DB but NOT in directory : ${extras.length}${extras.length ? ' (NOT deleted — review manually)' : ''}`);
    extras.forEach(n => console.log(`   • ${n}`));
}

main().catch(err => { console.error('FAILED:', err.message); process.exit(1); });
