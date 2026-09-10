import * as React from "react";
const FALLBACK = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='600'%3E%3Crect width='100%25' height='100%25' fill='%23eef1f3'/%3E%3Cpath d='M250 390l90-100 70 70 55-55 85 85' stroke='%23a6adb4' stroke-width='16' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3Ccircle cx='315' cy='230' r='36' fill='%23c8cdd2'/%3E%3C/svg%3E";
const Image = React.forwardRef(({ src, onError, ...props }, ref) => {
  const [value, setValue] = React.useState(src || FALLBACK);
  React.useEffect(() => setValue(src || FALLBACK), [src]);
  return <img ref={ref} src={value} loading="lazy" decoding="async" {...props} onError={(e)=>{ if(value!==FALLBACK) setValue(FALLBACK); onError?.(e); }} />;
});
Image.displayName = "Image";
export { Image };
