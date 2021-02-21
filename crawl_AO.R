library(tidyverse)
library(jsonlite)
library(curl)

ao <- read_json("data/ao.json", simplifyVector = TRUE)

for (i in ao$id) {
  path <- paste0("data/ao_JSON_files/output",i, ".json")
  if (!file.exists(path)) {
    print(path)
    fileConn<-file(path)
    con <- curl(paste0("https://www.atlasobscura.com/places/", i,".json?place_only=1"))
    writeLines(readLines(con), fileConn)
    close(fileConn)
    
    Sys.sleep(0.2)
  }
}


ao_web_infos <- data.frame()
for (path in list.files("data/ao_JSON_files/", full.names = TRUE)) {
  parsed <- read_json(path)
  # Remove empty lines
  parsed <- parsed[lapply(parsed, length) > 0]
  ao_web_infos <- bind_rows(ao_web_infos, as.data.frame(parsed))
}
write_csv(ao_web_infos, file = "data/ao_combined_json_info.csv")
