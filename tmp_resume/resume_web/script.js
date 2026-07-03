document.getElementById('printBtn').addEventListener('click', () => window.print());

// Small resume-like polish: highlight a line while hovering without changing the printed output.
document.querySelectorAll('li').forEach(item => {
  item.addEventListener('mouseenter', () => item.style.background = 'rgba(0, 102, 204, 0.06)');
  item.addEventListener('mouseleave', () => item.style.background = 'transparent');
});
