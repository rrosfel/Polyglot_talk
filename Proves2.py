from bs4 import BeautifulSoup
import requests

# The url from one of the Batch's newsletter
url = 'https://www.deeplearning.ai/the-batch/the-world-needs-more-intelligence/'

# Getting the content from the webpage's contents
response = requests.get(url)

# Using beautifulsoup to extract the text
soup = BeautifulSoup(response.text, 'html.parser')

# Find all the text in paragraph elements on the webpage
all_text = soup.find_all('p')


# Create an empty string to store the extracted text
combined_text = ""

# Iterate over 'all_text' and add to the combined_text string
for text in all_text:
    combined_text = combined_text  + "\n"+ text.get_text()

# Print the final combined text
print(combined_text)