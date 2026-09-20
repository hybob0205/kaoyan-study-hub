(() => {
  const themes=['light','paper','night'],labels={light:'日间',paper:'纸张',night:'夜间'},key='kaoyan-study-theme';
  let current='light';
  try{const saved=localStorage.getItem(key);if(themes.includes(saved))current=saved;}catch{}
  const apply=value=>{current=value;document.documentElement.dataset.theme=value;const button=document.getElementById('theme-toggle');if(button){button.textContent='主题：'+labels[value];button.setAttribute('aria-label','当前'+labels[value]+'主题，点击切换');}};
  apply(current);
  document.addEventListener('DOMContentLoaded',()=>{const header=document.querySelector('header');if(!header)return;const button=document.createElement('button');button.id='theme-toggle';button.className='theme-toggle';button.type='button';button.onclick=()=>{const next=themes[(themes.indexOf(current)+1)%themes.length];try{localStorage.setItem(key,next);}catch{}apply(next);};header.append(button);apply(current);});
})();
