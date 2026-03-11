
-- Fix banner boyut values to match actual rendered CSS dimensions
-- Container max-w-7xl = 1280px, Tailwind h-48=192px, h-36=144px, h-32=128px, h-28=112px

UPDATE banners SET boyut = '1280×192px' WHERE slug = 'anasayfa-ana-banner';
UPDATE banners SET boyut = '420×144px' WHERE slug = 'anasayfa-alt-1';
UPDATE banners SET boyut = '420×144px' WHERE slug = 'anasayfa-alt-2';
UPDATE banners SET boyut = '420×144px' WHERE slug = 'anasayfa-alt-3';
UPDATE banners SET boyut = '1280×128px' WHERE slug = 'ihale-detay-alt-banner';
UPDATE banners SET boyut = '1280×128px' WHERE slug = 'urun-detay-alt-banner';
UPDATE banners SET boyut = '1280×112px' WHERE slug = 'tekihale-alt-banner';
UPDATE banners SET boyut = '300×250px' WHERE slug = 'tekihale-sidebar';
UPDATE banners SET boyut = '1280×128px', konum = 'Sayfa altı, tam genişlik' WHERE slug = 'tekrehber-sidebar';
UPDATE banners SET boyut = '300×250px' WHERE slug = 'firma-detay-sidebar';
UPDATE banners SET boyut = '1280×160px' WHERE slug = 'dashboard-pro-banner';
