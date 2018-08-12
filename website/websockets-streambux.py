
import asyncio
import websockets

def retrieve_images(link):
	import urllib.request
	import os.path
	from selenium import webdriver
 
	options = webdriver.ChromeOptions()
	options.add_argument('--headless')
	options.add_argument('--no-sandbox')
	options.binary_location = "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe" # modify for heroku
	driver = webdriver.Chrome(chrome_options=options)

	stream_url = link
	driver.get(stream_url)
	
	import re
	folder = link
	folder = re.sub('[^\w\-_\. ]', '_', folder)

	try: 
		os.mkdir(folder)
	except FileExistsError:
		pass

	images = driver.find_elements_by_tag_name('img')
	for image in images:
		#print(image.get_attribute('src'))
		src = image.get_attribute('src')
		#print(os.path.basename(src))

		#downloads only if it is a picture
		if (os.path.basename(src).lower().endswith(('.png', '.jpg', '.jpeg'))):
			urllib.request.urlretrieve(src, folder + '/' + os.path.basename(src))
	 
	driver.close()
	
	

def qr_decode(encoded):
	from pyzbar.pyzbar import decode
	from PIL import Image
	decoded = decode(Image.open(encoded))
	#print(decode(Image.open(encoded)))
	if len(decoded) > 0:
		return decoded[0].data.decode("utf-8")

def compare_images(link, encoded):
	import glob
	types = ('*.png', '*.jpg', '*.jpeg')
	photos = []
	for files in types:
		photos.extend(glob.glob(link + "\\" + files))
	orig = qr_decode(encoded)
	if orig != None:
		for photo in photos:
			current = qr_decode(photo)
			if orig == current:
				return True
	return False



def qr_gen(encoded):
	import qrcode
	import base64
	img = qrcode.QRCode(error_correction=qrcode.constants.ERROR_CORRECT_L)
	img.add_data(encoded)

	qr = img.make_image(fill_color="black", back_color="white")
	file_name = encoded + '.png'

	import re
	qr_image = file_name
	qr_image = re.sub('[^\w\-_\. ]', '_', qr_image)
	
	img_file = open(qr_image, 'w')
	qr.save(qr_image)
	img_file.close()

	img_file = open(qr_image, 'rb')
	encoded_string = base64.b64encode(img_file.read()).decode("utf-8")
	return encoded_string

async def get_image(websocket, path):
    encode = await websocket.recv()
    image_base64 = qr_gen(encode)
    await websocket.send(image_base64)

async def scrap_images(websocket, path):
    stream_url = await websocket.recv()
    retrieve_images(stream_url)
    qr_code_found = compare_images(link, 'TESTTESTTEST.png')
    await websocket.send(qr_code_found)

image_ver = websockets.serve(get_image, 'localhost', 8765)

asyncio.get_event_loop().run_until_complete(image_ver)

#scrap = websockets.serve(scrap_images, 'localhost', 8764)

#asyncio.get_event_loop().run_until_complete(scrap)

asyncio.get_event_loop().run_forever()
