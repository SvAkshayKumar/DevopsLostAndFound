# Lost & Found App

## Overview
The **Lost & Found App** is a mobile application designed to help users report lost and found items efficiently. Users can post details about their lost or found items, contact item owners, and manage their profiles. The app is built using **React Native** and **Supabase** for authentication and database management.

## Features
- **User Authentication**: Secure login and signup with OTP-based password reset.
- **Profile Management**: Users can update their profile details and profile picture.
- **Post Lost/Found Items**: Users can add items with images, descriptions, and contact details.
- **Contact System**: Call, WhatsApp, or email item posters directly.
- **Activity Tracking**: Poster can view who contacted them and through which method.
- **Bug Reporting**: Directly send bug reports via email using a custom SMTP setup.
- **Hosted App Link**: [Expo Build](https://expo.dev/accounts/devadigaakshay04/projects/bolt-expo-nativewind/builds/e81c89b8-4502-4197-aeb4-cdf6200374fd)

## Tech Stack
- **Frontend**: React Native, NativeWind
- **Backend**: Supabase (Database & Authentication)
- **Storage**: Supabase Storage for images
- **Email Service**: Custom SMTP for password reset & bug reporting
- **Image Picker**: `react-native-image-picker`

## Installation
1. Clone the repository:
   ```sh
   git clone https://github.com/SvAkshayKumar/RvuLostAndFoundApp.git
   cd RvuLostAndFoundApp
   ```
2. Install dependencies:
   ```sh
   npm install
   ```
3. Set up **Supabase** credentials in `.env`:
   ```sh
   SUPABASE_URL=your_supabase_url
   SUPABASE_ANON_KEY=your_supabase_anon_key
   ```
4. Start the application:
   ```sh
   npx expo start
   ```

## Usage
- **Sign Up/Login** to access features.
- **Post an item** by providing details and images.
- **View lost/found items** and contact the poster.
- **Update your profile**, including avatar and password.
- **Report bugs** directly from the app.

## Contribution
Contributions are welcome! Feel free to fork the repository and submit pull requests.

## License
This project is licensed under the **MIT License**.

For more details, visit the **[GitHub Repository](https://github.com/SvAkshayKumar/RvuLostAndFoundApp/tree/main)**.

