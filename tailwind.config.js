/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './views/**/*.hbs', // Adjust this path based on your project structure
    './public/js/**/*.js', // Include any other file types if needed
  ],
  theme: {
    extend: {
      colors: {
        primary: '#3498db', // Custom primary color
        secondary: '#2ecc71', // Custom secondary color
        background: '#f1f1f1', // Custom background color
        text: '#333', // Custom text color
      },
    },
  },
  plugins: [],
}

