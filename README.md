<p align="center">
  <img src="docs/assets/Weather_To_Wear.png" height="auto">

  <h1 align="center">A Capstone Project for
   <a href="https://www.epiuse.com">
Epi-Use Africa     </a>
  </h1>

<div align="center">

[![Issues](https://img.shields.io/github/issues/COS301-SE-2025/Weather-To-Wear)](https://github.com/COS301-SE-2025/weather-to-wear/issues)
![GitHub pull requests](https://img.shields.io/github/issues-pr/COS301-SE-2025/Weather-To-Wear)
![GitHub languages](https://img.shields.io/github/languages/count/COS301-SE-2025/Weather-To-Wear)
![GitHub last commit](https://img.shields.io/github/last-commit/COS301-SE-2025/Weather-To-Wear)
![GitHub repo size](https://img.shields.io/github/repo-size/COS301-SE-2025/Weather-To-Wear)
![License](https://img.shields.io/badge/license-MIT-blue)

Code Coverage 
[![codecov](https://codecov.io/gh/COS301-SE-2025/Weather-To-Wear/main/graph/badge.svg)](https://codecov.io/gh/COS301-SE-2025/Weather-To-Wear)

Build Status
[![Build Status](https://github.com/COS301-SE-2025/Weather-To-Wear/actions/workflows/ci.yml/badge.svg)](https://github.com/COS301-SE-2025/Weather-To-Wear/actions/workflows/ci.yml)

Docker Support 
![Dockerized](https://img.shields.io/badge/docker-ready-blue)





🛑 Codecov badge pending due to GitHub organization restrictions. Code coverage is generated with `jest --coverage`. See `/app-backend/coverage/` for details.





<h3 align="center">
  Weather to Wear is a web-application that aims to
simplify weather forecasts into a personalized wardrobe
consultant. By analysing real-time weather forecasts
with the combination of a user's personalised styling
preferences, it uses AI-driven outfit suggestions to
provide appropriate fashion recommendations from a
user's personal clothing collection. The application
seeks to streamline the daily challenge of choosing
outfits that are weather-appropriate, ensuring users
step out confidently prepared for any weather condition
while expressing their unique fashion sense. 
</h3>

</p>

[Our Website](https://gitgood.netlify.app/)  

---

<h1 align="center"> Git Structure & Branching Strategy </h1>

The Weather to Wear project follows a monorepo structure, consolidating all components into a single GitHub repository for easier collaboration, integration, and deployment. The repository contains two main applications:
- `app-backend/` – Node.js backend with PostgreSQL, Dockerized and tested using Jest.
- `app-mobile/` – Frontend/mobile interface (under development).
- `.github/` – GitHub Actions workflows for CI/CD.
- `docs/` – Project documentation and planning assets.
- `infra/` – Infrastructure and deployment configurations.

We use a standardized Git branching model to support team collaboration and feature isolation:
- `main` – Stable production-ready branch.
- `dev` – Integration branch for completed features and testing.
- `feature/<name>` – Individual feature branches created from dev.
- `hotfix/<name>` – Emergency fixes branched from main.

---

<h1 align="center"> Project Boards </h1>

Track our progress on the GitHub Project Board:
- [Frontend](https://github.com/orgs/COS301-SE-2025/projects/159/views/1)
- [Backend-authentication](https://github.com/orgs/COS301-SE-2025/projects/180)
- [Backend-weather-API](https://github.com/orgs/COS301-SE-2025/projects/155)

---

  <h1 align="center"> Documentation and Resources </h1>

<div align="center" >



| Resource                             | Description                                                                                                                         |
|--------------------------------------|-------------------------------------------------------------------------------------------------------------------------------------|
| [Software Requirements Specification](https://www.canva.com/design/DAGn4e4ym68/cJ07x8_HtQvq838tb8P8jA/edit?utm_content=DAGn4e4ym68&utm_campaign=designshare&utm_medium=link2&utm_source=sharebutton)     | Details on project requirements            |
| [Architectural Specification]()             | System design overview                     |
| [Coding Standards]()           |  Guidelines for writing code      |
| [Git and GitHub Standards]()                        | Guidelines for using Git and GitHub               |
| [Testing Strategy and Standards]()                 | Testing strategies    |
| [Use-Case Diagrams]()                   | Use Case Diagrams               |
| [Class Diagram]()                        | Visual representation of Weather To Wear structure     |
| [Architecture Diagram]()                 | Diagram of system overview                 |
| [Deployment Diagram](https://drive.google.com/file/d/1BBB1pN3eXfr2grslP9WU_jZRM8dDGzgy/view?usp=sharing)                   | Plan for project deployment                |
| [Project Board](https://github.com/COS301-SE-2025/Weather-to-Wear/projects?query=is%3Aopen)                                                           | Team organisation and progress tracking    |
| [Tender Document Proposal](https://drive.google.com/file/d/16_RmKBtDhNpgXp95yghXMCpzRlVstp1S/view?usp=sharing)     | See our initial tender document   |

 <h1 align="center"> Demo Resources </h1>

<div align="center" >


| Demo                        | Video | Slides |
|---------------------------------|---------------------------------|---------------------------------|
| Demo 1 | [Demo 1 Video]() | [Demo 1 Slides]() |


</div>


  <h1 align="center">Technologies </h1>
  <div align="Center">

<p>Frontend</p>
  <img src="https://skillicons.dev/icons?i=react,typescript"/>
<p>Backend</p>
    <img src="https://skillicons.dev/icons?i=typescript,postgresql,express,prisma"/>
<p>Project Management & Deployment</p>
   <img src="https://skillicons.dev/icons?i=git,githubactions,npm,docker"/>
<p>Testing</p>
    <img src="https://skillicons.dev/icons?i=jest,cypress,postman"/>
  </div>





<br>

<h1 align="center">Meet The Team</h1>
<p align="center">
  <img src="docs/assets/team/Team.jpeg" width="600" height="auto" style="display: block; margin: 0 auto;">
</p><table style="border-width: 1px; width: 100%; font-family: Arial, sans-serif; border-collapse: collapse;">
  <tr>
    <td style="vertical-align: top; width:auto; border: 0; padding: 10px;">
 <img src="docs/assets/team/Kyle.jpg" width="auto" height="auto" style="display: block; margin: 0 auto; border-radius: 30px;">
    </td>
    <td style="vertical-align: top; width: auto; border: 0; padding: 10px;">
      <h2><b style="font-size: 18px;">Kyle Liebenberg
</b></h2>
      <h3><b style="font-size: 16px;">Project Manager, Services Engineer, Data Engineer, DevOps</b></h3><br>
       I am a final year Computer Science student, and have been working with computers and programming for over 7 years. I enjoy mathematics and problem solving which has been my driving force to enter this field of study. Recently, my interest has expanded into the world of Artificial Intelligence, where I am excited to explore how systems can solve real-world problems. When I'm not working I'm probably at the gym, playing pool, losing in chess, but most likely am fast asleep.
      <br><br>
      <a href="https://github.com/u22608789" style="text-decoration: none; margin-right: 10px; display: inline-block; vertical-align: middle;">
        <img src="https://skillicons.dev/icons?i=github"/>
      </a>
      <a href="https://www.linkedin.com/in/kyle-liebenberg-19a315325/" style="text-decoration: none; margin-right: 10px; display: inline-block; vertical-align: middle;">
        <img src="https://skillicons.dev/icons?i=linkedin">
      </a>
    </td>
  </tr>


 
  <tr>
    <td style="vertical-align: top; width:auto; border: 0; padding: 10px;">
      <img src="docs/assets/team/diya.jpg" width="auto" height="auto" style="display: block; margin: 0 auto; border-radius: 30px;">
    </td>
    <td style="vertical-align: top; width: auto; border: 0; padding: 10px;">
      <h2><b style="font-size: 18px;">Diya Budhia</b></h2>
      <h3><b style="font-size: 16px;">Architect, UI Designer, Integration Engineer, Testing Engineer</b></h3><br>
     I am currently a 3rd-year Computer Science student with a
passion for software development, coding, and creating
new and exciting things. I'm always eager to learn new
technologies and take on challenges that help me grow as
a developer. Outside of my academic and professional
interests, I enjoy a variety of hobbies including drumming,
running, and creating art, which help me stay creative and
balanced.
      <br><br>
      <a href="https://github.com/diyaxbudhia" style="text-decoration: none; margin-right: 10px; display: inline-block; vertical-align: middle;">
        <img src="https://skillicons.dev/icons?i=github"/>
      </a>
      <a href="https://www.linkedin.com/in/diya-budhia-a9124a355/" style="text-decoration: none; margin-right: 10px; display: inline-block; vertical-align: middle;">
        <img src="https://skillicons.dev/icons?i=linkedin">
      </a>
    </td>
  </tr>




  <tr>
    <td style="vertical-align: top; width:auto; border: 0; padding: 10px;">
      <img src="docs/assets/team/Bemo.jpg" width="auto" height="auto" style="display: block; margin: 0 auto; border-radius: 30px;">
    </td>
    <td style="vertical-align: top; width: auto; border: 0; padding: 10px;">
      <h2><b style="font-size: 18px;">Ibrahim Said</b></h2>
      <h3><b style="font-size: 16px;">Architect, DevOps, Integration Engineer, Services Engineer, Testing Engineer, Data Engineer</b></h3><br>
      As a final year Computer Science student, I enjoy
developing scalable, secure, and high-performance
systems. Since I started coding, I’ve found the process of
turning caffeine and sleepless nights into a working
program thrilling (for the most part!). My passion for
programming drives me to bring innovative and
dependable solutions to life! Outside of debugging code for
hours, I enjoy staying active by indulging in my hobbies,
including Kickboxing, bowling, and gym.
      <br><br>
      <a href="https://github.com/BemoSaid" style="text-decoration: none; margin-right: 10px; display: inline-block; vertical-align: middle;">
        <img src="https://skillicons.dev/icons?i=github"/>
      </a>
      <a href="https://www.linkedin.com/in/ibrahim-said-908156356/" style="text-decoration: none; margin-right: 10px; display: inline-block; vertical-align: middle;">
        <img src="https://skillicons.dev/icons?i=linkedin">
      </a>
    </td>
  </tr>




  <tr>
    <td style="vertical-align: top; width:auto; border: 0; padding: 10px;">
      <img src="docs/assets/team/Alisha.jpg" width="auto" height="auto" style="display: block; margin: 0 auto; border-radius: 30px;">
    </td>
    <td style="vertical-align: top; width: auto; border: 0; padding: 10px;">
      <h2><b style="font-size: 18px;">Alisha Perumal</b></h2>
      <h3><b style="font-size: 16px;">Architect, UI Engineer, DevOps, Business Analyst, Testing Engineer, Integration Engineer</b></h3><br>
     I am a final year computer science student with a passion
for computers and a curiosity about all things virtual,
including virtual worlds and their underlying systems. I am
deeply engaged in honing my skills and evolving as a
software developer and engineer. My fascination with
technology combined with my love for problem-solving,
has driven me to pursue a career in Software Development.
In my free time, i enjoy going to the gym, cooking for
friends and family, and hiking.
      <br><br>
      <a href="https://github.com/alishaperumal" style="text-decoration: none; margin-right: 10px; display: inline-block; vertical-align: middle;">
        <img src="https://skillicons.dev/icons?i=github"/>
      </a>
      <a href="https://www.linkedin.com/in/alisha-perumal-6b31bb356/" style="text-decoration: none; margin-right: 10px; display: inline-block; vertical-align: middle;">
        <img src="https://skillicons.dev/icons?i=linkedin">
      </a>
    </td>
  </tr>





  <tr>
    <td style="vertical-align: top; width:auto; border: 0; padding: 10px;">
      <img src="docs/assets/team/Taylor.jpg" width="auto" height="auto" style="display: block; margin: 0 auto; border-radius: 30px;">
    </td>
    <td style="vertical-align: top; width: auto; border: 0; padding: 10px;">
      <h2><b style="font-size: 18px;">Taylor Sergal
</b></h2>
      <h3><b style="font-size: 16px;">UI Engineer, Testing Engineer, Business Analyst, Integration Engineer</b></h3><br>
      I am a final year BSc Computer Science student with a
passion for frontend development and design. I am eager
to create systems that not only enhance user interaction
but overall user experience by utilizing the skills that I have
learnt along my educational journey. My personal interests
include reading, hanging out with friends and going to the
gym, allowing me to maintain a healthy work-life balance.
      <br><br>
      <a href="https://github.com/TaylorSergel" style="text-decoration: none; margin-right: 10px; display: inline-block; vertical-align: middle;">
        <img src="https://skillicons.dev/icons?i=github"/>
      </a>
      <a href="https://www.linkedin.com/in/taylor-sergel-aa267a354/" style="text-decoration: none; margin-right: 10px; display: inline-block; vertical-align: middle;">
        <img src="https://skillicons.dev/icons?i=linkedin">
      </a>
    </td>
  </tr>
</table>