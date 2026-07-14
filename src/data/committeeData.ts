export interface CommitteeMember {
    id: string;
    committeeId: string;
    name: string;
    clinic: string;
    role: string;
    image: string;
    displayOrder?: number;
}

export const INITIAL_COMMITTEE_MEMBERS: Omit<CommitteeMember, 'id'>[] = [
    // Membership
    {
        committeeId: 'membership',
        name: 'Dr. Sheryl M. Belen',
        clinic: 'Bethlehem Animal Clinic',
        role: 'Chairperson',
        image: '/committees/dr_sheryl_belen.png',
        displayOrder: 1
    },
    {
        committeeId: 'membership',
        name: 'Dr. Eden L. Llanera',
        clinic: 'Vet Lane Animal Clinic',
        role: 'Member',
        image: '/committees/dr_eden_llanera.png',
        displayOrder: 2
    },
    {
        committeeId: 'membership',
        name: 'Dr. Dyann Camille L. Javier',
        clinic: 'Pet Lovers Animal Center Emergency Services',
        role: 'Member',
        image: '/committees/dr_dyann_javier.png',
        displayOrder: 3
    },
    {
        committeeId: 'membership',
        name: 'Dr. Uldarico N. Astada III',
        clinic: 'Dogs Land Veterinary Clinic',
        role: 'Member',
        image: '/committees/dr_uldarico_astada.png',
        displayOrder: 4
    },
    {
        committeeId: 'membership',
        name: 'Dr. Melanie M. Pelayo',
        clinic: 'The Pet Project Vet Clinic',
        role: 'Member',
        image: '/committees/dr_melanie_pelayo.png',
        displayOrder: 5
    },
    {
        committeeId: 'membership',
        name: 'Dr. Maricel B. Garcia',
        clinic: 'Shambala Veterinary Clinic',
        role: 'Member',
        image: '/committees/dr_maricel_garcia.png',
        displayOrder: 6
    },
    // Accreditation
    {
        committeeId: 'accreditation',
        name: 'Dr. Luchi S. Orlanda',
        clinic: 'St. Hyacinth Animal Clinic',
        role: 'Chairperson',
        image: '/committees/dr_luchi_orlanda.png',
        displayOrder: 1
    },
    {
        committeeId: 'accreditation',
        name: 'Dr. Rhoda B. Baquiran',
        clinic: 'The Pet Mobile Corp.',
        role: 'Member',
        image: '/committees/dr_rhoda_baquiran.png',
        displayOrder: 2
    },
    {
        committeeId: 'accreditation',
        name: 'Dr. Hannah Gay S. Olavidez',
        clinic: 'Wags and Whiskers Veterinary Clinic',
        role: 'Member',
        image: '/committees/dr_hannah_olavidez.png',
        displayOrder: 3
    },
    {
        committeeId: 'accreditation',
        name: 'Dr. Nicholas D. Carpio',
        clinic: 'Vets in Practice Animal Hospital - Quezon City',
        role: 'Member',
        image: '/committees/dr_nicholas_carpio.png',
        displayOrder: 4
    },
    // Technical Standards
    {
        committeeId: 'technical-standards',
        name: 'Dr. Pretextato G. Chua III',
        clinic: 'Pet Wonders Veterinary Clinic',
        role: 'Chairperson',
        image: '/committees/dr_pretextato_chua.png',
        displayOrder: 1
    },
    {
        committeeId: 'technical-standards',
        name: 'Dr. Lester Louis L. Lopez',
        clinic: 'Manila East Veterinary Care',
        role: 'Member',
        image: '/committees/dr_lester_lopez.png',
        displayOrder: 2
    },
    {
        committeeId: 'technical-standards',
        name: 'Dr. Joanna Mercader',
        clinic: '',
        role: 'Member',
        image: '',
        displayOrder: 3
    },
    {
        committeeId: 'technical-standards',
        name: 'Dr. Edgardo Unson',
        clinic: '',
        role: 'Member',
        image: '',
        displayOrder: 4
    },
    {
        committeeId: 'technical-standards',
        name: 'Dr. Joy Santos',
        clinic: '',
        role: 'Member',
        image: '',
        displayOrder: 5
    },
    // CSR
    {
        committeeId: 'csr',
        name: 'Dr. Juanito S. Padrinao',
        clinic: 'JM Padrinao Animal Clinic',
        role: 'Chairperson',
        image: '/committees/dr_juanito_padrinao.png',
        displayOrder: 1
    },
    {
        committeeId: 'csr',
        name: 'Dr. Mitzi P. Padrinao',
        clinic: 'JM Padrinao Animal Clinic',
        role: 'Member',
        image: '/committees/dr_mitzi_padrinao.png',
        displayOrder: 2
    },
    {
        committeeId: 'csr',
        name: 'Dr. Nielsen B. Donato',
        clinic: 'Vets in Practice Animal Hospital',
        role: 'Member',
        image: '/committees/dr_nielsen_donato.png',
        displayOrder: 3
    },
    {
        committeeId: 'csr',
        name: 'Atty. Heidi M. Caguioa',
        clinic: 'Animal Kingdom Foundation',
        role: 'Member',
        image: '/committees/atty_heidi_caguioa.png',
        displayOrder: 4
    },
    {
        committeeId: 'csr',
        name: 'Dr. Jerry Alcantara',
        clinic: '',
        role: 'Member',
        image: '',
        displayOrder: 5
    },
    // CPD
    {
        committeeId: 'cpd',
        name: 'Dr. Solidad B. Salaver',
        clinic: 'Holy Spirit Animal Clinic',
        role: 'Chairperson',
        image: '/committees/dr_solidad_salaver.png',
        displayOrder: 1
    },
    {
        committeeId: 'cpd',
        name: 'Dr. Maricris P. Alcantara',
        clinic: 'Central Bark Pet Station & Grooming Services',
        role: 'Member',
        image: '/committees/dr_maricris_alcantara.png',
        displayOrder: 2
    },
    {
        committeeId: 'cpd',
        name: 'Dr. Ryan Abelardo Yandug III',
        clinic: 'Yandug Animal Care Clinic',
        role: 'Member',
        image: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?q=80&w=256&h=256&fit=crop',
        displayOrder: 3
    },
    {
        committeeId: 'cpd',
        name: 'Dr. Keshia Karmel Dane F. Chua',
        clinic: 'Pet Wonders Veterinary Clinic',
        role: 'Member',
        image: 'https://images.unsplash.com/photo-1594824813573-c100448135e9?q=80&w=256&h=256&fit=crop',
        displayOrder: 4
    },
    // Ethics
    {
        committeeId: 'ethics',
        name: 'Dr. Marcelo T. Evangelista',
        clinic: 'E.V. Dog and Cat Clinic',
        role: 'Chairperson',
        image: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?q=80&w=256&h=256&fit=crop',
        displayOrder: 1
    },
    {
        committeeId: 'ethics',
        name: 'Dr. Maysie T. Batinga',
        clinic: 'Batinga Animal Medical Center',
        role: 'Member',
        image: 'https://images.unsplash.com/photo-1559181567-c3190ca9959b?q=80&w=256&h=256&fit=crop',
        displayOrder: 2
    },
    {
        committeeId: 'ethics',
        name: 'Dr. Benedick D. Macaraeg',
        clinic: 'Animal Life Clinic and Supply',
        role: 'Member',
        image: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?q=80&w=256&h=256&fit=crop',
        displayOrder: 3
    },
    {
        committeeId: 'ethics',
        name: 'Dr. Daisy L. Macaraeg',
        clinic: 'Animal Life Clinic and Supply',
        role: 'Member',
        image: 'https://images.unsplash.com/photo-1594824813573-c100448135e9?q=80&w=256&h=256&fit=crop',
        displayOrder: 4
    }
];
