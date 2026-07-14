
export interface FormerOfficer {
    id?: string;
    year: number;
    officers: {
        name: string;
        role: string;
        image?: string;
    }[];
}

export const INITIAL_FORMER_OFFICERS: FormerOfficer[] = [
    {
        year: 1978,
        officers: [
            { name: "Dr. Enrique T. Carlos", role: "President" },
            { name: "Dr. Jose Ned R. Cabanlig", role: "Vice-President" },
            { name: "Dr. Jesus G. Lareza", role: "Secretary" },
            { name: "Dr. Oscar R. Dizon", role: "Treasurer" },
            { name: "Dr. Jose V. Valenzuela", role: "Auditor" },
            { name: "Dr. Mario A. Parreño", role: "PRO" },
            { name: "Dr. Francisco S. Cortez", role: "Director" },
            { name: "Dr. Enrique R. Carlos", role: "Ex-Officio" }
        ]
    },
    {
        year: 1979,
        officers: [
            { name: "Dr. Enrique T. Carlos", role: "President" },
            { name: "Dr. Jose Ned R. Cabanlig", role: "Vice-President" },
            { name: "Dr. Jesus G. Lareza", role: "Secretary" },
            { name: "Dr. Oscar R. Dizon", role: "Treasurer" },
            { name: "Dr. Jose V. Valenzuela", role: "Auditor" },
            { name: "Dr. Mario A. Parreño", role: "PRO" },
            { name: "Dr. Francisco S. Cortez", role: "Director" },
            { name: "Dr. Enrique R. Carlos", role: "Ex-Officio" }
        ]
    },
    {
        year: 1980,
        officers: [
            { name: "Dr. Enrique T. Carlos", role: "President" },
            { name: "Dr. Jose Ned R. Cabanlig", role: "Vice-President" },
            { name: "Dr. Jesus G. Lareza", role: "Secretary" },
            { name: "Dr. Oscar R. Dizon", role: "Treasurer" },
            { name: "Dr. Jose V. Valenzuela", role: "Auditor" },
            { name: "Dr. Mario A. Parreño", role: "PRO" },
            { name: "Dr. Francisco S. Cortez", role: "Director" },
            { name: "Dr. Enrique R. Carlos", role: "Ex-Officio" }
        ]
    },
    {
        year: 1981,
        officers: [
            { name: "Dr. Mario A. Parreño", role: "President" },
            { name: "Dr. Jose V. Valenzuela", role: "Vice-President" },
            { name: "Dr. Alex R. Martinez", role: "Secretary" },
            { name: "Dr. Jose Ned R. Cabanlig", role: "Treasurer" },
            { name: "Dr. Alejandro M. Castillo", role: "Auditor" },
            { name: "Dr. Jaime N. Cruel", role: "PRO" },
            { name: "Dr. Enrique T. Carlos", role: "Director" }
        ]
    },
    {
        year: 1982,
        officers: [
            { name: "Dr. Mario A. Parreño", role: "President" },
            { name: "Dr. Jose V. Valenzuela", role: "Vice-President" },
            { name: "Dr. Alex R. Martinez", role: "Secretary" },
            { name: "Dr. Jose Ned R. Cabanlig", role: "Treasurer" },
            { name: "Dr. Alejandro M. Castillo", role: "Auditor" },
            { name: "Dr. Jaime N. Cruel", role: "PRO" },
            { name: "Dr. Enrique T. Carlos", role: "Ex-Officio" }
        ]
    },
    {
        year: 1983,
        officers: [
            { name: "Dr. Jose V. Valenzuela", role: "President" },
            { name: "Dr. Eulogio Noel R. Alojipan", role: "Vice-President" },
            { name: "Dr. Rhodora G. Siapno-Carlos", role: "Secretary" },
            { name: "Dr. Alex R. Martinez", role: "Treasurer" },
            { name: "Dr. Zosimo J. de Leon", role: "Auditor" },
            { name: "Dr. Gabriel J. Paz", role: "PRO" },
            { name: "Dr. Edgar E. Cabantac", role: "Board Director" }
        ]
    },
    {
        year: 1984,
        officers: [
            { name: "Dr. Jose Ned R. Cabanlig", role: "President" },
            { name: "Dr. Alex R. Martinez", role: "Vice-President" },
            { name: "Dr. Cristina M. Barin-Paz", role: "Secretary" },
            { name: "Dr. Vergel G. Cruz", role: "Treasurer" },
            { name: "Dr. Danilo C. Vizmanos Jr.", role: "Auditor" },
            { name: "Dr. Menandro C. Valerio", role: "PRO" },
            { name: "Dr. Mario A. Parreño", role: "Board Director" }
        ]
    },
    {
        year: 1985,
        officers: [
            { name: "Dr. Alex R. Martinez", role: "President" },
            { name: "Dr. Danilo C. Vizmanos Jr.", role: "Vice-President" },
            { name: "Dr. Selina T. Gan-Sarmiento", role: "Secretary" },
            { name: "Dr. Cristina M. Barin-Paz", role: "Treasurer" },
            { name: "Dr. Manuel C. Carlos", role: "Auditor" },
            { name: "Dr. Frankel M. Viado", role: "PRO" },
            { name: "Dr. Jose V. Valenzuela", role: "Board Director" }
        ]
    },
    {
        year: 1986,
        officers: [
            { name: "Dr. Lydia G. Mangahas", role: "President" },
            { name: "Dr. Jose V. Valenzuela", role: "Vice-President" },
            { name: "Dr. Selina T. Gan-Sarmiento", role: "Secretary" },
            { name: "Dr. Cristina M. Barin-Paz", role: "Treasurer" },
            { name: "Dr. Danilo C. Vizmanos Jr.", role: "Director" }
        ]
    },
    {
        year: 1987,
        officers: [
            { name: "Dr. Jose Ned R. Cabanlig", role: "President" },
            { name: "Dr. Alex R. Martinez", role: "Vice-President" },
            { name: "Dr. Luzvimin S. Orillo-de Leon", role: "Secretary" },
            { name: "Dr. Vergel G. Cruz", role: "Treasurer" },
            { name: "Dr. Danilo C. Vizmanos Jr.", role: "Board Director" }
        ]
    },
    {
        year: 1988,
        officers: [
            { name: "Dr. Jose Ned R. Cabanlig", role: "President" },
            { name: "Dr. Alex R. Martinez", role: "Vice-President" },
            { name: "Dr. Luzvimin S. Orillo-de Leon", role: "Secretary" },
            { name: "Dr. Vergel G. Cruz", role: "Treasurer" },
            { name: "Dr. Danilo C. Vizmanos Jr.", role: "Board Director" }
        ]
    },
    {
        year: 1989,
        officers: [
            { name: "Dr. Zosimo J. de Leon", role: "President" },
            { name: "Dr. Menandro C. Valerio", role: "Vice-President" },
            { name: "Dr. Cristina M. Barin-Paz", role: "Secretary" },
            { name: "Dr. Vergel G. Cruz", role: "Treasurer" },
            { name: "Dr. Selino T. Gan-Sarmiento", role: "Board Director" },
            { name: "Dr. Abelardo B. Agulto", role: "Board Director" },
            { name: "Dr. Inocencio O. Cruz III", role: "Board Director" }
        ]
    },
    {
        year: 1990,
        officers: [
            { name: "Dr. Armando C. Moreno", role: "President" },
            { name: "Dr. Pedro S. Fariñas", role: "Vice-President" },
            { name: "Dr. Menandro C. Valerio", role: "Secretary" },
            { name: "Dr. Vergel G. Cruz", role: "Treasurer" },
            { name: "Dr. Zosimo J. de Leon", role: "Auditor" },
            { name: "Dr. Reynaldo G. Orio", role: "Board Director" },
            { name: "Dr. Abelardo B. Agulto", role: "Board Director" }
        ]
    },
    {
        year: 1991,
        officers: [
            { name: "Dr. Danilo C. Vizmanos Jr.", role: "President" },
            { name: "Dr. Eduardo E. Adona", role: "Vice-President" },
            { name: "Dr. Abelardo B. Agulto", role: "Secretary" },
            { name: "Dr. Rhodora G. Siapno-Carlos", role: "Treasurer" },
            { name: "Dr. Vergel G. Cruz", role: "Board Director" },
            { name: "Dr. Jose V. Valenzuela", role: "Board Director" },
            { name: "Dr. Menandro C. Valerio", role: "Board Director" }
        ]
    },
    {
        year: 1992,
        officers: [
            { name: "Dr. Menandro C. Valerio", role: "President" },
            { name: "Dr. Danilo C. Vizmanos Jr.", role: "Vice-President" },
            { name: "Dr. Corazon Ann C. Moreno", role: "Secretary" },
            { name: "Dr. Abelardo B. Agulto", role: "Treasurer" },
            { name: "Dr. Reynaldo G. Orio", role: "Auditor" },
            { name: "Dr. Pedro S. Fariñas", role: "Ex-Officio" }
        ]
    },
    {
        year: 1993,
        officers: [
            { name: "Dr. Abelardo B. Agulto", role: "President" },
            { name: "Dr. Reynaldo G. Orio", role: "Vice-President" },
            { name: "Dr. Corazon Ann C. Moreno", role: "Secretary" },
            { name: "Dr. Menandro C. Valerio", role: "Treasurer" },
            { name: "Dr. Eduardo E. Adona", role: "Board Director" },
            { name: "Dr. Danilo C. Vizmanos Jr.", role: "Board Director" },
            { name: "Dr. Zosimo J. de Leon", role: "Board Director" }
        ]
    },
    {
        year: 1994,
        officers: [
            { name: "Dr. Menandro C. Valerio", role: "President" },
            { name: "Dr. Pedro S. Fariñas", role: "Vice-President" },
            { name: "Dr. Corazon Ann C. Moreno", role: "Secretary" },
            { name: "Dr. Abelardo B. Agulto", role: "Treasurer" },
            { name: "Dr. Reynaldo G. Orio", role: "Auditor" },
            { name: "Dr. Eduardo E. Adona", role: "Ex-Officio" }
        ]
    },
    {
        year: 1995,
        officers: [
            { name: "Dr. Eduardo E. Adona", role: "President" },
            { name: "Dr. Corazon Ann C. Moreno", role: "Vice-President" },
            { name: "Dr. Pedro S. Fariñas", role: "Secretary" },
            { name: "Dr. Carlo L. Erba", role: "Treasurer" },
            { name: "Dr. Menandro C. Valerio", role: "Board Director" },
            { name: "Dr. Vergel G. Cruz", role: "Board Director" }
        ]
    },
    {
        year: 1996,
        officers: [
            { name: "Dr. Pedro S. Fariñas", role: "President" },
            { name: "Dr. Reynaldo G. Orio", role: "Vice-President" },
            { name: "Dr. Emmanuel C. Macasaet", role: "Secretary" },
            { name: "Dr. Amado A. Reyes", role: "Treasurer" },
            { name: "Dr. Menandro C. Valerio", role: "Ex-Officio" }
        ]
    },
    {
        year: 1997,
        officers: [
            { name: "Dr. Reynaldo G. Orio", role: "President" },
            { name: "Dr. Pedro S. Fariñas", role: "Vice-President" },
            { name: "Dr. Arnel M. Ocampo", role: "Secretary" },
            { name: "Dr. Menandro C. Valerio", role: "Treasurer" },
            { name: "Dr. Corazon Ann C. Moreno", role: "Auditor" },
            { name: "Dr. Eduardo E. Adona", role: "Ex-Officio" }
        ]
    },
    {
        year: 1998,
        officers: [
            { name: "Dr. Pedro S. Fariñas", role: "President" },
            { name: "Dr. Reynaldo G. Orio", role: "Vice-President" },
            { name: "Dr. Emmanuel C. Macasaet", role: "Secretary" },
            { name: "Dr. Amado A. Reyes", role: "Treasurer" },
            { name: "Dr. Menandro C. Valerio", role: "Auditor" },
            { name: "Dr. Eduardo E. Adona", role: "Ex-Officio" }
        ]
    },
    {
        year: 1999,
        officers: [
            { name: "Dr. Menandro C. Valerio", role: "President" },
            { name: "Dr. Arnel M. Ocampo", role: "Vice-President" },
            { name: "Dr. Gelo N. Carillo", role: "Secretary" },
            { name: "Dr. Rey A. Orio", role: "Treasurer" },
            { name: "Dr. Cecilio F. Quillo", role: "Auditor" },
            { name: "Dr. Reynaldo G. Orio", role: "Ex-Officio" }
        ]
    },
    {
        year: 2000,
        officers: [
            { name: "Dr. Emmanuel C. Macasaet", role: "President" },
            { name: "Dr. Rey A. Orio", role: "Vice-President" },
            { name: "Dr. Arnel M. Ocampo", role: "Secretary" },
            { name: "Dr. Loida C. Angeles", role: "Treasurer" },
            { name: "Dr. Armando C. Moreno", role: "Auditor" },
            { name: "Dr. Menandro C. Valerio", role: "Ex-Officio" }
        ]
    },
    {
        year: 2001,
        officers: [
            { name: "Dr. Emmanuel C. Macasaet", role: "President" },
            { name: "Dr. Rey A. Orio", role: "Vice-President" },
            { name: "Dr. Loida C. Angeles", role: "Secretary" },
            { name: "Dr. Armando C. Moreno", role: "Treasurer" },
            { name: "Dr. Arnel M. Ocampo", role: "Auditor" },
            { name: "Dr. Pedro S. Fariñas", role: "Ex-Officio" }
        ]
    },
    {
        year: 2002,
        officers: [
            { name: "Dr. Loida C. Angeles", role: "President" },
            { name: "Dr. Marcial O. Ocampos", role: "Vice-President" },
            { name: "Dr. Arnel M. Ocampo", role: "Secretary" },
            { name: "Dr. Gelo N. Carillo", role: "Treasurer" },
            { name: "Dr. Armando C. Moreno", role: "Auditor" },
            { name: "Dr. Luzvimin S. Orio", role: "Ex-Officio" },
            { name: "Dr. Emmanuel C. Macasaet", role: "Director" }
        ]
    },
    {
        year: 2003,
        officers: [
            { name: "Dr. Loida C. Angeles", role: "President" },
            { name: "Dr. Jesus Rene R. Dalisay Jr.", role: "Vice-President" },
            { name: "Dr. Edith N. Ching", role: "Secretary" },
            { name: "Dr. Marlo M. Orio", role: "Treasurer" },
            { name: "Dr. Arnel M. Ocampo", role: "Auditor" },
            { name: "Dr. Ma. Rube L. Lever", role: "Director" }
        ]
    },
    {
        year: 2004,
        officers: [
            { name: "Dr. Loida C. Angeles", role: "President" },
            { name: "Dr. Arnel M. Ocampo", role: "Vice-President" },
            { name: "Dr. Marlo M. Orio", role: "Secretary" },
            { name: "Dr. Edith N. Ching", role: "Treasurer" },
            { name: "Dr. Rhodora G. Siapno-Carlos", role: "Auditor" },
            { name: "Dr. Luzvimin S. Orio", role: "Director" }
        ]
    },
    {
        year: 2005,
        officers: [
            { name: "Dr. Jesus Rene R. Dalisay Jr.", role: "President" },
            { name: "Dr. Marlo M. Orio", role: "Vice-President" },
            { name: "Dr. Edith N. Ching", role: "Secretary" },
            { name: "Dr. Lilibeth C. Ching", role: "Treasurer" },
            { name: "Dr. Clarissa R. Campos-Collar", role: "Auditor" },
            { name: "Dr. Sidney I. Magsayo", role: "Director" }
        ]
    },
    {
        year: 2006,
        officers: [
            { name: "Dr. Loida C. Angeles", role: "President" },
            { name: "Dr. Marlo M. Orio", role: "Vice-President" },
            { name: "Dr. Edith N. Ching", role: "Secretary" },
            { name: "Dr. Lilibeth C. Ching", role: "Treasurer" },
            { name: "Dr. Clarissa R. Campos-Collar", role: "Auditor" },
            { name: "Dr. Philip J.L. Reyes", role: "Director" },
            { name: "Dr. Arnel M. Ocampo", role: "Ex-Officio" }
        ]
    },
    {
        year: 2007,
        officers: [
            { name: "Dr. Jesus Rene R. Dalisay Jr.", role: "President" },
            { name: "Dr. Marlo M. Orio", role: "Vice-President" },
            { name: "Dr. Edith N. Ching", role: "Secretary" },
            { name: "Dr. Lilibeth C. Ching", role: "Treasurer" },
            { name: "Dr. Clarissa R. Campos-Collar", role: "Auditor" },
            { name: "Dr. Sidney I. Magsayo", role: "Director" },
            { name: "Dr. Loida C. Angeles", role: "Ex-Officio" }
        ]
    },
    {
        year: 2008,
        officers: [
            { name: "Dr. Marlo M. Orio", role: "President" },
            { name: "Dr. Oscar O. Nisce Jr.", role: "Vice-President" },
            { name: "Dr. Clarissa R. Campos-Collar", role: "Secretary" },
            { name: "Dr. Lilibeth C. Ching", role: "Treasurer" },
            { name: "Dr. Edith N. Ching", role: "Auditor" },
            { name: "Dr. Francisco A. Colayco", role: "Director" },
            { name: "Dr. Loida C. Angeles", role: "Ex-Officio" }
        ]
    },
    {
        year: 2009,
        officers: [
            { name: "Dr. Jesus Rene R. Dalisay Jr.", role: "President" },
            { name: "Dr. Loida C. Angeles", role: "Vice-President" },
            { name: "Dr. Marlo M. Orio", role: "Secretary" },
            { name: "Dr. Edith N. Ching", role: "Treasurer" },
            { name: "Dr. Lilibeth C. Ching", role: "Auditor" },
            { name: "Dr. Sidney I. Magsayo", role: "Director" },
            { name: "Dr. Clarissa R. Campos-Collar", role: "Ex-Officio" }
        ]
    },
    {
        year: 2010,
        officers: [
            { name: "Dr. Oscar O. Nisce Jr.", role: "President" },
            { name: "Dr. Clarissa R. Campos-Collar", role: "Vice-President" },
            { name: "Dr. Lilibeth C. Ching", role: "Secretary" },
            { name: "Dr. Godfrey Mel T. Gavino", role: "Asst. Secretary" },
            { name: "Dr. Loida C. Angeles", role: "Treasurer" },
            { name: "Dr. Edith N. Ching", role: "Auditor" },
            { name: "Dr. Francisco A. Colayco", role: "Director" },
            { name: "Dr. Marlo M. Orio", role: "Ex-Officio" }
        ]
    },
    {
        year: 2011,
        officers: [
            { name: "Dr. Jesus Rene R. Dalisay Jr.", role: "President" },
            { name: "Dr. Lilibeth C. Ching", role: "Vice-President" },
            { name: "Dr. Loida C. Angeles", role: "Secretary" },
            { name: "Dr. Clarissa R. Campos-Collar", role: "Treasurer" },
            { name: "Dr. Edith N. Ching", role: "Auditor" },
            { name: "Dr. Sidney I. Magsayo", role: "Director" },
            { name: "Dr. Marlo M. Orio", role: "Past President" }
        ]
    },
    {
        year: 2012,
        officers: [
            { name: "Dr. Clarissa R. Campos-Collar", role: "President" },
            { name: "Dr. Lilibeth C. Ching", role: "Vice-President" },
            { name: "Dr. Godfrey Mel T. Gavino", role: "Secretary" },
            { name: "Dr. Loida C. Angeles", role: "Treasurer" },
            { name: "Dr. Peachy J. Medina", role: "Auditor" },
            { name: "Dr. Francisco A. Colayco", role: "Director" },
            { name: "Dr. Oscar O. Nisce Jr.", role: "Past President" }
        ]
    },
    {
        year: 2013,
        officers: [
            { name: "Dr. Oscar O. Nisce Jr.", role: "President" },
            { name: "Dr. Francisco A. Colayco", role: "Vice-President" },
            { name: "Dr. Lilibeth C. Ching", role: "Secretary" },
            { name: "Dr. Loida C. Angeles", role: "Treasurer" },
            { name: "Dr. Clarissa R. Campos-Collar", role: "Auditor" },
            { name: "Dr. Godfrey Mel T. Gavino", role: "Director" }
        ]
    },
    {
        year: 2014,
        officers: [
            { name: "Dr. Loida C. Angeles", role: "President" },
            { name: "Dr. Lilibeth C. Ching", role: "Secretary" },
            { name: "Dr. Clarissa R. Campos-Collar", role: "Treasurer" },
            { name: "Dr. Francisco A. Colayco", role: "Auditor" },
            { name: "Dr. Arnel M. Ocampo", role: "Director" },
            { name: "Dr. Peachy J. Medina", role: "Director" },
            { name: "Dr. Anthony T. Albano", role: "Trustee" }
        ]
    },
    {
        year: 2015,
        officers: [
            { name: "Dr. Anthony T. Albano", role: "President" },
            { name: "Dr. Lilibeth C. Ching", role: "Vice-President" },
            { name: "Dr. Edgar Voltaire F. Cervantes", role: "Secretary" },
            { name: "Dr. Larry B. Harrison", role: "Treasurer" },
            { name: "Dr. Ryan Sherwin C. Maring II", role: "Auditor" },
            { name: "Dr. Geiselle I. Macalindong", role: "Director" },
            { name: "Dr. Loida C. Angeles", role: "Past President" }
        ]
    },
    {
        year: 2016,
        officers: [
            { name: "Dr. Lilibeth C. Ching", role: "President" },
            { name: "Dr. Anthony T. Albano", role: "Vice-President" },
            { name: "Dr. Edgar Voltaire F. Cervantes", role: "Secretary" },
            { name: "Dr. Larry B. Harrison", role: "Treasurer" },
            { name: "Dr. Ryan Sherwin C. Maring II", role: "Auditor" },
            { name: "Dr. Peachy J. Medina", role: "Director" },
            { name: "Dr. Loida C. Angeles", role: "Past President" }
        ]
    },
    {
        year: 2017,
        officers: [
            { name: "Dr. Anthony T. Albano", role: "President" },
            { name: "Dr. Ryan Sherwin C. Maring II", role: "Vice-President" },
            { name: "Dr. Edgar Voltaire F. Cervantes", role: "Secretary" },
            { name: "Dr. Larry B. Harrison", role: "Treasurer" },
            { name: "Dr. Geiselle I. Macalindong", role: "Auditor" },
            { name: "Dr. Peachy J. Medina", role: "Director" },
            { name: "Dr. Lilibeth C. Ching", role: "Past President" }
        ]
    },
    {
        year: 2018,
        officers: [
            { name: "Dr. Edgar Voltaire F. Cervantes", role: "President" },
            { name: "Dr. Ryan Sherwin C. Maring II", role: "Vice-President" },
            { name: "Dr. Geiselle I. Macalindong", role: "Secretary" },
            { name: "Dr. Anthony T. Albano", role: "Treasurer" },
            { name: "Dr. Peachy J. Medina", role: "Auditor" },
            { name: "Dr. Ma. Theresa P. Cenzon", role: "Director" },
            { name: "Dr. Lilibeth C. Ching", role: "Past President" }
        ]
    },
    {
        year: 2019,
        officers: [
            { name: "Dr. Ryan Sherwin C. Maring II", role: "President" },
            { name: "Dr. Edgar Voltaire F. Cervantes", role: "Vice-President" },
            { name: "Dr. Geiselle I. Macalindong", role: "Secretary" },
            { name: "Dr. Peachy J. Medina", role: "Treasurer" },
            { name: "Dr. Ma. Theresa P. Cenzon", role: "Auditor" },
            { name: "Dr. Anthony T. Albano", role: "Director" },
            { name: "Dr. Lilibeth C. Ching", role: "Past President" }
        ]
    },
    {
        year: 2020,
        officers: [
            { name: "Dr. Mayca T. Batinga", role: "President" },
            { name: "Dr. Nicholas D.G. Carpo", role: "Vice-President" },
            { name: "Dr. Melany G. Celestial", role: "Secretary" },
            { name: "Dr. Luchi S. Olanda", role: "Treasurer" },
            { name: "Dr. Ryan Sherwin C. Maring II", role: "Past President" }
        ]
    },
    {
        year: 2021,
        officers: [
            { name: "Dr. Amie C. Rabasa", role: "President" },
            { name: "Dr. Amelia R. Elecsoda", role: "Vice-President" },
            { name: "Dr. May Eulabeth L. Javier", role: "Secretary" },
            { name: "Dr. Divina N. Magsison", role: "Director" },
            { name: "Dr. Mayca T. Batinga", role: "Past President" }
        ]
    },
    {
        year: 2022,
        officers: [
            { name: "Dr. Amie C. Rabasa", role: "President" },
            { name: "Dr. Amelia R. Elecsoda", role: "Vice-President" },
            { name: "Dr. May Eulabeth L. Javier", role: "Secretary" },
            { name: "Dr. Divina N. Magsison", role: "Treasurer" },
            { name: "Dr. Mayca T. Batinga", role: "Past President" }
        ]
    },
    {
        year: 2023,
        officers: [
            { name: "Dr. Melany G. Celestial", role: "President" },
            { name: "Dr. Marcus P. Alcantara", role: "Vice-President" },
            { name: "Dr. Benedicta G. Macaranga", role: "Secretary" },
            { name: "Dr. May Eulabeth L. Javier", role: "Treasurer" },
            { name: "Dr. Amie C. Rabasa", role: "Past President" }
        ]
    },
    {
        year: 2024,
        officers: [
            { name: "Dr. Nicholas D.G. Carpo", role: "President" },
            { name: "Dr. Amelia R. Elecsoda", role: "Vice-President" },
            { name: "Dr. Luchi S. Olanda", role: "Secretary" },
            { name: "Dr. Sherwy M. Belen", role: "Treasurer" },
            { name: "Dr. Felecitas O. Celestial", role: "Auditor" },
            { name: "Dr. Melany G. Celestial", role: "Past President" }
        ]
    },
    {
        year: 2025,
        officers: [
            { name: "Dr. Luchi S. Olanda", role: "President" },
            { name: "Dr. Marcus P. Alcantara", role: "Secretary" },
            { name: "Dr. Sherwy M. Belen", role: "Treasurer" },
            { name: "Dr. Nicholas D.G. Carpo", role: "Past President" }
        ]
    }
];
