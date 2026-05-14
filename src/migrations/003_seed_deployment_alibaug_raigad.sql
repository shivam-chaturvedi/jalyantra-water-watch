-- JalYantra: seed Deployments page entry for Alibaug, Raigad

insert into public.deployments (slug, title, data)
values
(
  'alibaug-raigad',
  'JalYantra Deployment in Alibaug, Raigad, Maharashtra',
  $json$
  {
    "heading": "JalYantra Deployment in Alibaug, Raigad, Maharashtra",
    "intro": "JalYantra was deployed in 3 different open wells in Alibaug, Raigad in April 2026. The deployment focused on installation stability, sensor positioning, getting power from attached pump, and daily groundwater monitoring in village environments.",
    "summary": "During the JalYantra field deployment in Alibaug, Raigad, one of the clearest observations was the growing pressure on groundwater during summer. Rapid development of luxury villas, farmhouses, resorts, and second homes, accelerated by projects like the RoRo ferry and Atal Setu, is significantly increasing groundwater stress in the area. Many large properties have installed multiple private borewells to maintain lawns and gardens and because of indiscriminate extraction ground water level is falling.\n\nResidents increasingly depend on private water tankers during peak summer. In the community well where JalYantra was installed, the water level had dropped so low that the electric pump had already been shut down. Only around 2 feet of water remained at the bottom of the well, forcing residents to manually draw water from nearly 10 feet below. The visit showed that while groundwater extraction is increasing rapidly, local groundwater recharge and monitoring systems remain very limited.\n\nMedia folder (videos + images): https://drive.google.com/drive/folders/1upHaA1MxfrSLpbO69FdGiOJS0VEiQ8Uj?usp=sharing",
    "interviewVideoUrl": "",
    "installations": [
      {
        "title": "Site 1 — Samaaj Mandir, Zirad Pada (Device 7)",
        "videoUrl": "",
        "notes": "Location: Samaaj Mandir, Zirad Pada. Date: 29 April 2025. Device Number: 7\n\nAt this site the device was initially connected to the pump so JalYantra would switch on during pump operation. However, residents informed us that the pump had been shut down nearly 15 days earlier because the water level had fallen too low. As a temporary solution, the device was connected directly to a nearby power source and will be reconnected to the pump once monsoon rains raise the water level.\n\nAfter installation, the device showed incorrect readings. Investigation revealed that the water level had fallen to nearly 12 meters, while the installed sensor had an effective range of only 8–9 meters. The device was then replaced with a higher-range sensor capable of measuring greater depths."
      },
      {
        "title": "Site 2 — Private Farm House, Zirad (Device 8)",
        "videoUrl": "",
        "notes": "Location: Private Farm House, Zirad. Date: 29 April 2025. Device Number: 8\n\nAt this site, one of the main challenges was providing power to the device. The water pump was submerged inside the well, while the electrical control panel was located more than 50 meters away, making a direct connection difficult. As a practical solution, the device was connected to nearby lights that are switched on every evening. Whenever the lights turn on, JalYantra also powers on and records the water depth."
      },
      {
        "title": "Site 3 — Hanuman Mandir, Zirad (Device 9)",
        "videoUrl": "",
        "notes": "Location: Hanuman Mandir, Zirad. Date: 29 April 2025. Device Number: 9\n\nAt this site, it was difficult to find a suitable place to install the device on the rim of the well because the community well becomes crowded throughout the day when residents gather to collect water and carry out daily activities such as washing and bathing. The well structure was also made of stone, making drilling difficult. To avoid creating any obstruction, the device was finally mounted on a nearby pole next to the well wall, while still maintaining a clear line of sight to the water surface for accurate measurements."
      }
    ],
    "gallery": [],
    "previewVideoUrl": "",
    "previewImages": []
  }
  $json$::jsonb
)
on conflict (slug) do update
set
  title = excluded.title,
  data = excluded.data;

