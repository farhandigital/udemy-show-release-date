import { fetchCourseCreationDate } from "@/utils/udemy-api";

const REAL_COURSE_ID = "851712";

function main() {
  fetchCourseCreationDate(REAL_COURSE_ID)
    .then((date) => {
      console.log(`Course Creation Date: ${date}`);
    })
    .catch((error) => {
      console.error("Error fetching course creation date:", error);
    });
}

main();