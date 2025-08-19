import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const mappings = [
    // Bank Fees & Interest
    { plaidCategory: 'Bank Fees', customCategory: 'Bank Fees & Interest' },
    { plaidCategory: 'Overdraft', customCategory: 'Bank Fees & Interest' },
    { plaidCategory: 'ATM', customCategory: 'Bank Fees & Interest' },
    { plaidCategory: 'Late Payment', customCategory: 'Bank Fees & Interest' },
    { plaidCategory: 'Fraud Dispute', customCategory: 'Bank Fees & Interest' },
    {
      plaidCategory: 'Foreign Transaction',
      customCategory: 'Bank Fees & Interest',
    },
    { plaidCategory: 'Wire Transfer', customCategory: 'Bank Fees & Interest' },
    {
      plaidCategory: 'Insufficient Funds',
      customCategory: 'Bank Fees & Interest',
    },
    { plaidCategory: 'Cash Advance', customCategory: 'Bank Fees & Interest' },
    {
      plaidCategory: 'Excess Activity',
      customCategory: 'Bank Fees & Interest',
    },
    {
      plaidCategory: 'Interest Earned',
      customCategory: 'Bank Fees & Interest',
    },
    {
      plaidCategory: 'Interest Charged',
      customCategory: 'Bank Fees & Interest',
    },

    // Rent & Mortgage
    { plaidCategory: 'Rent', customCategory: 'Rent & Mortgage' },
    { plaidCategory: 'Mortgage', customCategory: 'Rent & Mortgage' },
    { plaidCategory: 'Loans', customCategory: 'Loan Payments' },
    {
      plaidCategory: 'Apartments, Condos and Houses',
      customCategory: 'Rent & Mortgage',
    },
    { plaidCategory: 'Property Management', customCategory: 'Rent & Mortgage' },

    // Utilities
    { plaidCategory: 'Utilities', customCategory: 'Utilities' },
    { plaidCategory: 'Water', customCategory: 'Utilities' },
    {
      plaidCategory: 'Sanitary and Waste Management',
      customCategory: 'Utilities',
    },
    { plaidCategory: 'Gas', customCategory: 'Utilities' },
    { plaidCategory: 'Electric', customCategory: 'Utilities' },
    {
      plaidCategory: 'Heating, Ventilating, and Air Conditioning',
      customCategory: 'Utilities',
    },

    // Phone & Internet
    { plaidCategory: 'Internet Services', customCategory: 'Phone & Internet' },
    { plaidCategory: 'Cable', customCategory: 'Phone & Internet' },
    {
      plaidCategory: 'Telecommunication Services',
      customCategory: 'Phone & Internet',
    },
    { plaidCategory: 'Mobile Phones', customCategory: 'Phone & Internet' },

    // Groceries
    {
      plaidCategory: 'Supermarkets and Groceries',
      customCategory: 'Groceries',
    },
    { plaidCategory: 'Farmers Markets', customCategory: 'Groceries' },
    { plaidCategory: 'Health Food', customCategory: 'Groceries' },
    { plaidCategory: 'Food and Beverage Store', customCategory: 'Groceries' },
    { plaidCategory: 'Convenience Stores', customCategory: 'Groceries' },

    // Transportation
    {
      plaidCategory: 'Public Transportation Services',
      customCategory: 'Transportation',
    },
    { plaidCategory: 'Taxi', customCategory: 'Transportation' },
    { plaidCategory: 'Ride Share', customCategory: 'Transportation' },
    { plaidCategory: 'Gas Stations', customCategory: 'Transportation' },
    { plaidCategory: 'Tolls and Fees', customCategory: 'Transportation' },
    { plaidCategory: 'Parking', customCategory: 'Transportation' },
    {
      plaidCategory: 'Car and Truck Rentals',
      customCategory: 'Transportation',
    },
    { plaidCategory: 'Car Service', customCategory: 'Transportation' },
    { plaidCategory: 'Limos and Chauffeurs', customCategory: 'Transportation' },
    {
      plaidCategory: 'Transportation Centers',
      customCategory: 'Transportation',
    },
    {
      plaidCategory: 'Airlines and Aviation Services',
      customCategory: 'Travel',
    },
    { plaidCategory: 'Cruises', customCategory: 'Travel' },

    // Insurance
    { plaidCategory: 'Insurance', customCategory: 'Insurance' },

    // Subscriptions & Streaming Services
    {
      plaidCategory: 'Subscription',
      customCategory: 'Subscriptions & Streaming Services',
    },
    {
      plaidCategory: 'Music, Video and DVD',
      customCategory: 'Subscriptions & Streaming Services',
    },
    {
      plaidCategory: 'Newspapers and Magazines',
      customCategory: 'Subscriptions & Streaming Services',
    },
    {
      plaidCategory: 'Online Advertising',
      customCategory: 'Subscriptions & Streaming Services',
    },

    // Loan Payments
    { plaidCategory: 'Loan', customCategory: 'Loan Payments' },
    {
      plaidCategory: 'Student Aid and Grants',
      customCategory: 'Loan Payments',
    },
    { plaidCategory: 'Credit Card', customCategory: 'Loan Payments' },

    // Childcare & Tuition
    {
      plaidCategory: 'Day Care and Preschools',
      customCategory: 'Childcare & Tuition',
    },
    {
      plaidCategory: 'Primary and Secondary Schools',
      customCategory: 'Childcare & Tuition',
    },
    {
      plaidCategory: 'Colleges and Universities',
      customCategory: 'Childcare & Tuition',
    },
    {
      plaidCategory: 'Vocational Schools',
      customCategory: 'Childcare & Tuition',
    },
    {
      plaidCategory: 'Tutoring and Educational Services',
      customCategory: 'Childcare & Tuition',
    },
    { plaidCategory: 'Driving Schools', customCategory: 'Childcare & Tuition' },
    { plaidCategory: 'Dance Schools', customCategory: 'Childcare & Tuition' },
    {
      plaidCategory: 'Culinary Lessons and Schools',
      customCategory: 'Childcare & Tuition',
    },
    {
      plaidCategory: 'Computer Training',
      customCategory: 'Childcare & Tuition',
    },
    { plaidCategory: 'Art School', customCategory: 'Childcare & Tuition' },
    { plaidCategory: 'Adult Education', customCategory: 'Childcare & Tuition' },

    // Dining & Takeout
    { plaidCategory: 'Restaurants', customCategory: 'Dining & Takeout' },
    { plaidCategory: 'Fast Food', customCategory: 'Dining & Takeout' },
    { plaidCategory: 'Coffee Shop', customCategory: 'Dining & Takeout' },
    { plaidCategory: 'Bar', customCategory: 'Dining & Takeout' },
    { plaidCategory: 'Wine Bar', customCategory: 'Dining & Takeout' },
    { plaidCategory: 'Sports Bar', customCategory: 'Dining & Takeout' },
    { plaidCategory: 'Hotel Lounge', customCategory: 'Dining & Takeout' },
    { plaidCategory: 'Breweries', customCategory: 'Dining & Takeout' },
    { plaidCategory: 'Nightlife', customCategory: 'Dining & Takeout' },
    { plaidCategory: 'Night Clubs', customCategory: 'Dining & Takeout' },
    { plaidCategory: 'Karaoke', customCategory: 'Dining & Takeout' },
    {
      plaidCategory: 'Jazz and Blues Cafe',
      customCategory: 'Dining & Takeout',
    },
    { plaidCategory: 'Hookah Lounges', customCategory: 'Dining & Takeout' },
    { plaidCategory: 'Winery', customCategory: 'Dining & Takeout' },
    {
      plaidCategory: 'Vegan and Vegetarian',
      customCategory: 'Dining & Takeout',
    },
    { plaidCategory: 'Turkish', customCategory: 'Dining & Takeout' },
    { plaidCategory: 'Thai', customCategory: 'Dining & Takeout' },
    { plaidCategory: 'Swiss', customCategory: 'Dining & Takeout' },
    { plaidCategory: 'Sushi', customCategory: 'Dining & Takeout' },
    { plaidCategory: 'Steakhouses', customCategory: 'Dining & Takeout' },
    { plaidCategory: 'Spanish', customCategory: 'Dining & Takeout' },
    { plaidCategory: 'Seafood', customCategory: 'Dining & Takeout' },
    { plaidCategory: 'Scandinavian', customCategory: 'Dining & Takeout' },
    { plaidCategory: 'Portuguese', customCategory: 'Dining & Takeout' },
    { plaidCategory: 'Pizza', customCategory: 'Dining & Takeout' },
    { plaidCategory: 'Moroccan', customCategory: 'Dining & Takeout' },
    { plaidCategory: 'Middle Eastern', customCategory: 'Dining & Takeout' },
    { plaidCategory: 'Mexican', customCategory: 'Dining & Takeout' },
    { plaidCategory: 'Mediterranean', customCategory: 'Dining & Takeout' },
    { plaidCategory: 'Latin American', customCategory: 'Dining & Takeout' },
    { plaidCategory: 'Korean', customCategory: 'Dining & Takeout' },
    { plaidCategory: 'Juice Bar', customCategory: 'Dining & Takeout' },
    { plaidCategory: 'Japanese', customCategory: 'Dining & Takeout' },
    { plaidCategory: 'Italian', customCategory: 'Dining & Takeout' },
    { plaidCategory: 'Indonesian', customCategory: 'Dining & Takeout' },
    { plaidCategory: 'Indian', customCategory: 'Dining & Takeout' },
    { plaidCategory: 'Ice Cream', customCategory: 'Dining & Takeout' },
    { plaidCategory: 'Greek', customCategory: 'Dining & Takeout' },
    { plaidCategory: 'German', customCategory: 'Dining & Takeout' },
    { plaidCategory: 'Gastropub', customCategory: 'Dining & Takeout' },
    { plaidCategory: 'French', customCategory: 'Dining & Takeout' },
    { plaidCategory: 'Food Truck', customCategory: 'Dining & Takeout' },
    { plaidCategory: 'Fish and Chips', customCategory: 'Dining & Takeout' },
    { plaidCategory: 'Filipino', customCategory: 'Dining & Takeout' },
    { plaidCategory: 'Falafel', customCategory: 'Dining & Takeout' },
    { plaidCategory: 'Ethiopian', customCategory: 'Dining & Takeout' },
    { plaidCategory: 'Eastern European', customCategory: 'Dining & Takeout' },
    { plaidCategory: 'Donuts', customCategory: 'Dining & Takeout' },
    { plaidCategory: 'Diners', customCategory: 'Dining & Takeout' },
    { plaidCategory: 'Dessert', customCategory: 'Dining & Takeout' },
    { plaidCategory: 'Delis', customCategory: 'Dining & Takeout' },
    { plaidCategory: 'Cupcake Shop', customCategory: 'Dining & Takeout' },
    { plaidCategory: 'Cuban', customCategory: 'Dining & Takeout' },
    { plaidCategory: 'Chinese', customCategory: 'Dining & Takeout' },
    { plaidCategory: 'Caribbean', customCategory: 'Dining & Takeout' },
    { plaidCategory: 'Cajun', customCategory: 'Dining & Takeout' },
    { plaidCategory: 'Cafe', customCategory: 'Dining & Takeout' },
    { plaidCategory: 'Burrito', customCategory: 'Dining & Takeout' },
    { plaidCategory: 'Burgers', customCategory: 'Dining & Takeout' },
    { plaidCategory: 'Breakfast Spot', customCategory: 'Dining & Takeout' },
    { plaidCategory: 'Brazilian', customCategory: 'Dining & Takeout' },
    { plaidCategory: 'Barbecue', customCategory: 'Dining & Takeout' },
    { plaidCategory: 'Bakery', customCategory: 'Dining & Takeout' },
    { plaidCategory: 'Bagel Shop', customCategory: 'Dining & Takeout' },
    { plaidCategory: 'Australian', customCategory: 'Dining & Takeout' },
    { plaidCategory: 'Asian', customCategory: 'Dining & Takeout' },
    { plaidCategory: 'American', customCategory: 'Dining & Takeout' },
    { plaidCategory: 'African', customCategory: 'Dining & Takeout' },
    { plaidCategory: 'Afghan', customCategory: 'Dining & Takeout' },

    // Shopping
    { plaidCategory: 'Shops', customCategory: 'Shopping' },
    { plaidCategory: 'Department Stores', customCategory: 'Shopping' },
    { plaidCategory: 'Outlet', customCategory: 'Shopping' },
    { plaidCategory: 'Clothing and Accessories', customCategory: 'Shopping' },
    { plaidCategory: 'Electronics', customCategory: 'Shopping' },
    { plaidCategory: 'Computers and Electronics', customCategory: 'Shopping' },
    { plaidCategory: 'Video Games', customCategory: 'Shopping' },
    { plaidCategory: 'Cameras', customCategory: 'Shopping' },
    { plaidCategory: 'Construction Supplies', customCategory: 'Shopping' },
    { plaidCategory: 'Discount Stores', customCategory: 'Shopping' },
    { plaidCategory: 'Electrical Equipment', customCategory: 'Shopping' },
    { plaidCategory: 'Flea Markets', customCategory: 'Shopping' },
    { plaidCategory: 'Florists', customCategory: 'Shopping' },
    { plaidCategory: 'Furniture and Home Decor', customCategory: 'Shopping' },
    { plaidCategory: 'Gift and Novelty', customCategory: 'Shopping' },
    { plaidCategory: 'Glasses and Optometrist', customCategory: 'Shopping' },
    { plaidCategory: 'Hobby and Collectibles', customCategory: 'Shopping' },
    { plaidCategory: 'Industrial Supplies', customCategory: 'Shopping' },
    { plaidCategory: 'Jewelry and Watches', customCategory: 'Shopping' },
    { plaidCategory: 'Luggage', customCategory: 'Shopping' },
    { plaidCategory: 'Marine Supplies', customCategory: 'Shopping' },
    { plaidCategory: 'Musical Instruments', customCategory: 'Shopping' },
    { plaidCategory: 'Newsstands', customCategory: 'Shopping' },
    { plaidCategory: 'Office Supplies', customCategory: 'Shopping' },
    { plaidCategory: 'Pawn Shops', customCategory: 'Shopping' },
    { plaidCategory: 'Pets', customCategory: 'Shopping' },
    { plaidCategory: 'Photos and Frames', customCategory: 'Shopping' },
    { plaidCategory: 'Shopping Centers and Malls', customCategory: 'Shopping' },
    { plaidCategory: 'Sporting Goods', customCategory: 'Shopping' },
    { plaidCategory: 'Toys', customCategory: 'Shopping' },
    { plaidCategory: 'Vintage and Thrift', customCategory: 'Shopping' },
    {
      plaidCategory: 'Warehouses and Wholesale Stores',
      customCategory: 'Shopping',
    },
    { plaidCategory: 'Wedding and Bridal', customCategory: 'Shopping' },
    { plaidCategory: 'Wholesale', customCategory: 'Shopping' },
    { plaidCategory: 'Lawn and Garden', customCategory: 'Shopping' },

    // Entertainment
    { plaidCategory: 'Entertainment', customCategory: 'Entertainment' },
    { plaidCategory: 'Movie Theatres', customCategory: 'Entertainment' },
    {
      plaidCategory: 'Arcades and Amusement Parks',
      customCategory: 'Entertainment',
    },
    {
      plaidCategory: 'Theatrical Productions',
      customCategory: 'Entertainment',
    },
    { plaidCategory: 'Symphony and Opera', customCategory: 'Entertainment' },
    { plaidCategory: 'Sports Venues', customCategory: 'Entertainment' },
    { plaidCategory: 'Social Clubs', customCategory: 'Entertainment' },
    {
      plaidCategory: 'Psychics and Astrologers',
      customCategory: 'Entertainment',
    },
    { plaidCategory: 'Party Centers', customCategory: 'Entertainment' },
    { plaidCategory: 'Music and Show Venues', customCategory: 'Entertainment' },
    { plaidCategory: 'Museums', customCategory: 'Entertainment' },
    {
      plaidCategory: 'Fairgrounds and Rodeos',
      customCategory: 'Entertainment',
    },
    {
      plaidCategory: 'Dance Halls and Saloons',
      customCategory: 'Entertainment',
    },
    {
      plaidCategory: 'Circuses and Carnivals',
      customCategory: 'Entertainment',
    },
    { plaidCategory: 'Casinos and Gaming', customCategory: 'Entertainment' },
    { plaidCategory: 'Bowling', customCategory: 'Entertainment' },
    { plaidCategory: 'Billiards and Pool', customCategory: 'Entertainment' },
    {
      plaidCategory: 'Art Dealers and Galleries',
      customCategory: 'Entertainment',
    },
    { plaidCategory: 'Aquarium', customCategory: 'Entertainment' },

    // Health & Fitness
    {
      plaidCategory: 'Gyms and Fitness Centers',
      customCategory: 'Health & Fitness',
    },
    { plaidCategory: 'Yoga and Pilates', customCategory: 'Health & Fitness' },
    { plaidCategory: 'Sports Clubs', customCategory: 'Health & Fitness' },
    { plaidCategory: 'Athletic Fields', customCategory: 'Health & Fitness' },
    { plaidCategory: 'Baseball', customCategory: 'Health & Fitness' },
    { plaidCategory: 'Basketball', customCategory: 'Health & Fitness' },
    { plaidCategory: 'Batting Cages', customCategory: 'Health & Fitness' },
    { plaidCategory: 'Boating', customCategory: 'Health & Fitness' },
    {
      plaidCategory: 'Campgrounds and RV Parks',
      customCategory: 'Health & Fitness',
    },
    { plaidCategory: 'Canoes and Kayaks', customCategory: 'Health & Fitness' },
    { plaidCategory: 'Combat Sports', customCategory: 'Health & Fitness' },
    { plaidCategory: 'Cycling', customCategory: 'Health & Fitness' },
    { plaidCategory: 'Dance', customCategory: 'Health & Fitness' },
    { plaidCategory: 'Equestrian', customCategory: 'Health & Fitness' },
    { plaidCategory: 'Football', customCategory: 'Health & Fitness' },
    { plaidCategory: 'Go Carts', customCategory: 'Health & Fitness' },
    { plaidCategory: 'Golf', customCategory: 'Health & Fitness' },
    { plaidCategory: 'Gun Ranges', customCategory: 'Health & Fitness' },
    { plaidCategory: 'Gymnastics', customCategory: 'Health & Fitness' },
    { plaidCategory: 'Hiking', customCategory: 'Health & Fitness' },
    { plaidCategory: 'Hockey', customCategory: 'Health & Fitness' },
    { plaidCategory: 'Hot Air Balloons', customCategory: 'Health & Fitness' },
    {
      plaidCategory: 'Hunting and Fishing',
      customCategory: 'Health & Fitness',
    },
    { plaidCategory: 'Miniature Golf', customCategory: 'Health & Fitness' },
    { plaidCategory: 'Outdoors', customCategory: 'Health & Fitness' },
    { plaidCategory: 'Paintball', customCategory: 'Health & Fitness' },
    { plaidCategory: 'Parks', customCategory: 'Health & Fitness' },
    { plaidCategory: 'Personal Trainers', customCategory: 'Health & Fitness' },
    { plaidCategory: 'Race Tracks', customCategory: 'Health & Fitness' },
    { plaidCategory: 'Racquet Sports', customCategory: 'Health & Fitness' },
    { plaidCategory: 'Racquetball', customCategory: 'Health & Fitness' },
    { plaidCategory: 'Rafting', customCategory: 'Health & Fitness' },
    { plaidCategory: 'Recreation Centers', customCategory: 'Health & Fitness' },
    { plaidCategory: 'Rock Climbing', customCategory: 'Health & Fitness' },
    { plaidCategory: 'Running', customCategory: 'Health & Fitness' },
    { plaidCategory: 'Scuba Diving', customCategory: 'Health & Fitness' },
    { plaidCategory: 'Skating', customCategory: 'Health & Fitness' },
    { plaidCategory: 'Skydiving', customCategory: 'Health & Fitness' },
    { plaidCategory: 'Snow Sports', customCategory: 'Health & Fitness' },
    { plaidCategory: 'Soccer', customCategory: 'Health & Fitness' },
    {
      plaidCategory: 'Sports and Recreation Camps',
      customCategory: 'Health & Fitness',
    },
    {
      plaidCategory: 'Stadiums and Arenas',
      customCategory: 'Health & Fitness',
    },
    { plaidCategory: 'Swimming', customCategory: 'Health & Fitness' },
    { plaidCategory: 'Tennis', customCategory: 'Health & Fitness' },
    { plaidCategory: 'Water Sports', customCategory: 'Health & Fitness' },
    { plaidCategory: 'Zoo', customCategory: 'Health & Fitness' },

    // Travel
    { plaidCategory: 'Travel', customCategory: 'Travel' },
    {
      plaidCategory: 'Airlines and Aviation Services',
      customCategory: 'Travel',
    },
    { plaidCategory: 'Hotels and Motels', customCategory: 'Travel' },
    { plaidCategory: 'Cruises', customCategory: 'Travel' },
    { plaidCategory: 'Airports', customCategory: 'Travel' },
    { plaidCategory: 'Boat', customCategory: 'Travel' },
    { plaidCategory: 'Bus Stations', customCategory: 'Travel' },
    { plaidCategory: 'Car and Truck Rentals', customCategory: 'Travel' },
    { plaidCategory: 'Car Service', customCategory: 'Travel' },
    { plaidCategory: 'Charter Buses', customCategory: 'Travel' },
    { plaidCategory: 'Heliports', customCategory: 'Travel' },
    { plaidCategory: 'Limos and Chauffeurs', customCategory: 'Travel' },
    { plaidCategory: 'Lodging', customCategory: 'Travel' },
    { plaidCategory: 'Resorts', customCategory: 'Travel' },
    { plaidCategory: 'Lodges and Vacation Rentals', customCategory: 'Travel' },
    { plaidCategory: 'Hostels', customCategory: 'Travel' },
    { plaidCategory: 'Cottages and Cabins', customCategory: 'Travel' },
    { plaidCategory: 'Bed and Breakfasts', customCategory: 'Travel' },
    { plaidCategory: 'Transportation Centers', customCategory: 'Travel' },

    // Medical & Pharmacy
    { plaidCategory: 'Pharmacies', customCategory: 'Medical & Pharmacy' },
    {
      plaidCategory: 'Hospitals, Clinics and Medical Centers',
      customCategory: 'Medical & Pharmacy',
    },
    { plaidCategory: 'Dentists', customCategory: 'Medical & Pharmacy' },
    { plaidCategory: 'Psychologists', customCategory: 'Medical & Pharmacy' },
    {
      plaidCategory: 'Pregnancy and Sexual Health',
      customCategory: 'Medical & Pharmacy',
    },
    { plaidCategory: 'Podiatrists', customCategory: 'Medical & Pharmacy' },
    { plaidCategory: 'Physical Therapy', customCategory: 'Medical & Pharmacy' },
    { plaidCategory: 'Optometrists', customCategory: 'Medical & Pharmacy' },
    { plaidCategory: 'Nutritionists', customCategory: 'Medical & Pharmacy' },
    { plaidCategory: 'Nurses', customCategory: 'Medical & Pharmacy' },
    { plaidCategory: 'Mental Health', customCategory: 'Medical & Pharmacy' },
    {
      plaidCategory: 'Medical Supplies and Labs',
      customCategory: 'Medical & Pharmacy',
    },
    {
      plaidCategory: 'Emergency Services',
      customCategory: 'Medical & Pharmacy',
    },
    {
      plaidCategory: 'Counseling and Therapy',
      customCategory: 'Medical & Pharmacy',
    },
    { plaidCategory: 'Chiropractors', customCategory: 'Medical & Pharmacy' },
    {
      plaidCategory: 'Blood Banks and Centers',
      customCategory: 'Medical & Pharmacy',
    },
    {
      plaidCategory: 'Alternative Medicine',
      customCategory: 'Medical & Pharmacy',
    },
    { plaidCategory: 'Acupuncture', customCategory: 'Medical & Pharmacy' },
    { plaidCategory: 'Physicians', customCategory: 'Medical & Pharmacy' },
    { plaidCategory: 'Urologists', customCategory: 'Medical & Pharmacy' },
    { plaidCategory: 'Respiratory', customCategory: 'Medical & Pharmacy' },
    { plaidCategory: 'Radiologists', customCategory: 'Medical & Pharmacy' },
    { plaidCategory: 'Psychiatrists', customCategory: 'Medical & Pharmacy' },
    { plaidCategory: 'Plastic Surgeons', customCategory: 'Medical & Pharmacy' },
    { plaidCategory: 'Pediatricians', customCategory: 'Medical & Pharmacy' },
    { plaidCategory: 'Pathologists', customCategory: 'Medical & Pharmacy' },
    {
      plaidCategory: 'Orthopedic Surgeons',
      customCategory: 'Medical & Pharmacy',
    },
    { plaidCategory: 'Ophthalmologists', customCategory: 'Medical & Pharmacy' },
    { plaidCategory: 'Oncologists', customCategory: 'Medical & Pharmacy' },
    {
      plaidCategory: 'Obstetricians and Gynecologists',
      customCategory: 'Medical & Pharmacy',
    },
    { plaidCategory: 'Neurologists', customCategory: 'Medical & Pharmacy' },
    {
      plaidCategory: 'Internal Medicine',
      customCategory: 'Medical & Pharmacy',
    },
    { plaidCategory: 'General Surgery', customCategory: 'Medical & Pharmacy' },
    {
      plaidCategory: 'Gastroenterologists',
      customCategory: 'Medical & Pharmacy',
    },
    { plaidCategory: 'Family Medicine', customCategory: 'Medical & Pharmacy' },
    {
      plaidCategory: 'Ear, Nose and Throat',
      customCategory: 'Medical & Pharmacy',
    },
    { plaidCategory: 'Dermatologists', customCategory: 'Medical & Pharmacy' },
    { plaidCategory: 'Cardiologists', customCategory: 'Medical & Pharmacy' },
    {
      plaidCategory: 'Anesthesiologists',
      customCategory: 'Medical & Pharmacy',
    },
    { plaidCategory: 'Veterinarians', customCategory: 'Medical & Pharmacy' },

    // Business Expenses
    { plaidCategory: 'Business Services', customCategory: 'Business Expenses' },
    {
      plaidCategory: 'Advertising and Marketing',
      customCategory: 'Business Expenses',
    },
    { plaidCategory: 'Office Supplies', customCategory: 'Business Expenses' },
    {
      plaidCategory: 'Printing and Publishing',
      customCategory: 'Business Expenses',
    },
    {
      plaidCategory: 'Business and Strategy Consulting',
      customCategory: 'Business Expenses',
    },
    {
      plaidCategory: 'Employment Agencies',
      customCategory: 'Business Expenses',
    },
    {
      plaidCategory: 'Events and Event Planning',
      customCategory: 'Business Expenses',
    },
    { plaidCategory: 'Financial', customCategory: 'Business Expenses' },
    { plaidCategory: 'Taxes', customCategory: 'Business Expenses' },
    { plaidCategory: 'Stock Brokers', customCategory: 'Business Expenses' },
    {
      plaidCategory: 'Loans and Mortgages',
      customCategory: 'Business Expenses',
    },
    {
      plaidCategory: 'Holding and Investment Offices',
      customCategory: 'Business Expenses',
    },
    { plaidCategory: 'Fund Raising', customCategory: 'Business Expenses' },
    {
      plaidCategory: 'Financial Planning and Investments',
      customCategory: 'Business Expenses',
    },
    { plaidCategory: 'Credit Reporting', customCategory: 'Business Expenses' },
    { plaidCategory: 'Collections', customCategory: 'Business Expenses' },
    { plaidCategory: 'Check Cashing', customCategory: 'Business Expenses' },
    {
      plaidCategory: 'Business Brokers and Franchises',
      customCategory: 'Business Expenses',
    },
    {
      plaidCategory: 'Banking and Finance',
      customCategory: 'Business Expenses',
    },
    { plaidCategory: 'ATMs', customCategory: 'Business Expenses' },
    {
      plaidCategory: 'Accounting and Bookkeeping',
      customCategory: 'Business Expenses',
    },

    // Taxes & Government Payments
    { plaidCategory: 'Taxes', customCategory: 'Taxes & Government Payments' },
    {
      plaidCategory: 'Government Departments and Agencies',
      customCategory: 'Taxes & Government Payments',
    },
    {
      plaidCategory: 'Government Lobbyists',
      customCategory: 'Taxes & Government Payments',
    },
    { plaidCategory: 'Courts', customCategory: 'Taxes & Government Payments' },
    {
      plaidCategory: 'Law Enforcement',
      customCategory: 'Taxes & Government Payments',
    },
    {
      plaidCategory: 'Police Stations',
      customCategory: 'Taxes & Government Payments',
    },
    {
      plaidCategory: 'Fire Stations',
      customCategory: 'Taxes & Government Payments',
    },
    {
      plaidCategory: 'Correctional Institutions',
      customCategory: 'Taxes & Government Payments',
    },
    {
      plaidCategory: 'Military',
      customCategory: 'Taxes & Government Payments',
    },
    {
      plaidCategory: 'Post Offices',
      customCategory: 'Taxes & Government Payments',
    },

    // Income
    { plaidCategory: 'Payroll', customCategory: 'Income' },
    { plaidCategory: 'Benefits', customCategory: 'Income' },

    // Transfers & Internal Accounts
    {
      plaidCategory: 'Internal Account Transfer',
      customCategory: 'Transfers & Internal Accounts',
    },
    { plaidCategory: 'ACH', customCategory: 'Transfers & Internal Accounts' },
    {
      plaidCategory: 'Billpay',
      customCategory: 'Transfers & Internal Accounts',
    },
    { plaidCategory: 'Check', customCategory: 'Transfers & Internal Accounts' },
    {
      plaidCategory: 'Credit',
      customCategory: 'Transfers & Internal Accounts',
    },
    { plaidCategory: 'Debit', customCategory: 'Transfers & Internal Accounts' },
    {
      plaidCategory: 'Deposit',
      customCategory: 'Transfers & Internal Accounts',
    },
    {
      plaidCategory: 'Keep the Change Savings Program',
      customCategory: 'Transfers & Internal Accounts',
    },
    {
      plaidCategory: 'Third Party',
      customCategory: 'Transfers & Internal Accounts',
    },
    { plaidCategory: 'Venmo', customCategory: 'Transfers & Internal Accounts' },
    {
      plaidCategory: 'Square Cash',
      customCategory: 'Transfers & Internal Accounts',
    },
    {
      plaidCategory: 'Square',
      customCategory: 'Transfers & Internal Accounts',
    },
    {
      plaidCategory: 'PayPal',
      customCategory: 'Transfers & Internal Accounts',
    },
    {
      plaidCategory: 'Dwolla',
      customCategory: 'Transfers & Internal Accounts',
    },
    {
      plaidCategory: 'Coinbase',
      customCategory: 'Transfers & Internal Accounts',
    },
    {
      plaidCategory: 'Chase QuickPay',
      customCategory: 'Transfers & Internal Accounts',
    },
    {
      plaidCategory: 'Acorns',
      customCategory: 'Transfers & Internal Accounts',
    },
    { plaidCategory: 'Digit', customCategory: 'Transfers & Internal Accounts' },
    {
      plaidCategory: 'Betterment',
      customCategory: 'Transfers & Internal Accounts',
    },
    { plaidCategory: 'Plaid', customCategory: 'Transfers & Internal Accounts' },
    { plaidCategory: 'Wire', customCategory: 'Transfers & Internal Accounts' },
    {
      plaidCategory: 'Withdrawal',
      customCategory: 'Transfers & Internal Accounts',
    },
    {
      plaidCategory: 'Save As You Go',
      customCategory: 'Transfers & Internal Accounts',
    },

    // Home Maintenance & Repairs
    {
      plaidCategory: 'Home Improvement',
      customCategory: 'Home Maintenance & Repairs',
    },
    {
      plaidCategory: 'Upholstery',
      customCategory: 'Home Maintenance & Repairs',
    },
    {
      plaidCategory: 'Tree Service',
      customCategory: 'Home Maintenance & Repairs',
    },
    {
      plaidCategory: 'Swimming Pool Maintenance and Services',
      customCategory: 'Home Maintenance & Repairs',
    },
    { plaidCategory: 'Storage', customCategory: 'Home Maintenance & Repairs' },
    {
      plaidCategory: 'Pools and Spas',
      customCategory: 'Home Maintenance & Repairs',
    },
    { plaidCategory: 'Plumbing', customCategory: 'Home Maintenance & Repairs' },
    {
      plaidCategory: 'Pest Control',
      customCategory: 'Home Maintenance & Repairs',
    },
    { plaidCategory: 'Movers', customCategory: 'Home Maintenance & Repairs' },
    {
      plaidCategory: 'Mobile Homes',
      customCategory: 'Home Maintenance & Repairs',
    },
    {
      plaidCategory: 'Lighting Fixtures',
      customCategory: 'Home Maintenance & Repairs',
    },
    {
      plaidCategory: 'Landscaping and Gardeners',
      customCategory: 'Home Maintenance & Repairs',
    },
    { plaidCategory: 'Kitchens', customCategory: 'Home Maintenance & Repairs' },
    {
      plaidCategory: 'Interior Design',
      customCategory: 'Home Maintenance & Repairs',
    },
    {
      plaidCategory: 'Housewares',
      customCategory: 'Home Maintenance & Repairs',
    },
    {
      plaidCategory: 'Home Inspection Services',
      customCategory: 'Home Maintenance & Repairs',
    },
    {
      plaidCategory: 'Home Appliances',
      customCategory: 'Home Maintenance & Repairs',
    },
    {
      plaidCategory: 'Heating, Ventilation and Air Conditioning',
      customCategory: 'Home Maintenance & Repairs',
    },
    {
      plaidCategory: 'Hardware and Services',
      customCategory: 'Home Maintenance & Repairs',
    },
    {
      plaidCategory: 'Fences, Fireplaces and Garage Doors',
      customCategory: 'Home Maintenance & Repairs',
    },
    {
      plaidCategory: 'Doors and Windows',
      customCategory: 'Home Maintenance & Repairs',
    },
    {
      plaidCategory: 'Architects',
      customCategory: 'Home Maintenance & Repairs',
    },
    {
      plaidCategory: 'Construction',
      customCategory: 'Home Maintenance & Repairs',
    },
    { plaidCategory: 'Roofers', customCategory: 'Home Maintenance & Repairs' },
    { plaidCategory: 'Painting', customCategory: 'Home Maintenance & Repairs' },
    { plaidCategory: 'Masonry', customCategory: 'Home Maintenance & Repairs' },
    {
      plaidCategory: 'Electricians',
      customCategory: 'Home Maintenance & Repairs',
    },
    {
      plaidCategory: 'Contractors',
      customCategory: 'Home Maintenance & Repairs',
    },
    {
      plaidCategory: 'Carpet and Flooring',
      customCategory: 'Home Maintenance & Repairs',
    },
    {
      plaidCategory: 'Carpenters',
      customCategory: 'Home Maintenance & Repairs',
    },

    // Personal Care
    {
      plaidCategory: 'Personal Care',
      customCategory: 'Personal Care - Salons, Grooming, Products',
    },
    {
      plaidCategory: 'Tattooing',
      customCategory: 'Personal Care - Salons, Grooming, Products',
    },
    {
      plaidCategory: 'Tanning Salons',
      customCategory: 'Personal Care - Salons, Grooming, Products',
    },
    {
      plaidCategory: 'Spas',
      customCategory: 'Personal Care - Salons, Grooming, Products',
    },
    {
      plaidCategory: 'Skin Care',
      customCategory: 'Personal Care - Salons, Grooming, Products',
    },
    {
      plaidCategory: 'Piercing',
      customCategory: 'Personal Care - Salons, Grooming, Products',
    },
    {
      plaidCategory: 'Massage Clinics and Therapists',
      customCategory: 'Personal Care - Salons, Grooming, Products',
    },
    {
      plaidCategory: 'Manicures and Pedicures',
      customCategory: 'Personal Care - Salons, Grooming, Products',
    },
    {
      plaidCategory: 'Laundry and Garment Services',
      customCategory: 'Personal Care - Salons, Grooming, Products',
    },
    {
      plaidCategory: 'Hair Salons and Barbers',
      customCategory: 'Personal Care - Salons, Grooming, Products',
    },
    {
      plaidCategory: 'Hair Removal',
      customCategory: 'Personal Care - Salons, Grooming, Products',
    },
    {
      plaidCategory: 'Beauty Products',
      customCategory: 'Personal Care - Salons, Grooming, Products',
    },

    // Gifts & Donations
    {
      plaidCategory: 'Gifts and Donations',
      customCategory: 'Gifts & Donations',
    },
    {
      plaidCategory: 'Charities and Non-Profits',
      customCategory: 'Gifts & Donations',
    },
    { plaidCategory: 'Religious', customCategory: 'Gifts & Donations' },
    { plaidCategory: 'Temple', customCategory: 'Gifts & Donations' },
    { plaidCategory: 'Synagogues', customCategory: 'Gifts & Donations' },
    { plaidCategory: 'Mosques', customCategory: 'Gifts & Donations' },
    { plaidCategory: 'Churches', customCategory: 'Gifts & Donations' },
  ];

  for (const mapping of mappings) {
    await prisma.plaidCategoryMapping.create({
      data: mapping,
    });
  }
  console.log('Seeding completed successfully!');
}
main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
