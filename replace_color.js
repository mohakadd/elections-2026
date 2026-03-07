const fs = require('fs');

let content = fs.readFileSync('admin.html', 'utf8');

const config = `<script>
    tailwind.config = {
      theme: {
        extend: {
          colors: {
            brand: {
              50: '#f4ebfa',
              100: '#e9d7f5',
              200: '#d4afea',
              300: '#be87e0',
              400: '#a35ad1',
              500: '#7914ce',
              600: '#6410ab',
              700: '#4d0c83',
              800: '#36095c',
              900: '#200537',
            }
          }
        }
      }
    }
  </script>`;

if (!content.includes('tailwind.config')) {
    content = content.replace('<link href="https://fonts.googleapis.com', config + '\n    <link href="https://fonts.googleapis.com');
}

content = content.replace(/bg-slate-800/g, 'bg-brand-500');
content = content.replace(/hover:bg-slate-900/g, 'hover:bg-brand-600');
content = content.replace(/focus:ring-slate-300/g, 'focus:ring-brand-300');
content = content.replace(/focus:ring-slate-500/g, 'focus:ring-brand-500');
content = content.replace(/focus:border-slate-500/g, 'focus:border-brand-500');

fs.writeFileSync('admin.html', content);
console.log('admin.html updated');
