import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  base: '/',                   // you host at domain root
  build:{
    rollupOptions:{
      input:{
        main:        resolve(__dirname,'index.html'),
        tabEditor:   resolve(__dirname,'tab-editor.html'),
        lessonIndex: resolve(__dirname,'lessons/lesson-index.html'),
        lesson0:     resolve(__dirname,'lessons/lesson0.html'),
        lesson1:     resolve(__dirname,'lessons/lesson1.html'),
        lesson2:     resolve(__dirname,'lessons/lesson2.html'),
        lesson3:     resolve(__dirname,'lessons/lesson3.html')
      }
    }
  }
});