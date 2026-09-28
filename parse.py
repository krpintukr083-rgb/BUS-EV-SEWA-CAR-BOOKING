import xml.etree.ElementTree as ET
import sys
sys.stdout.reconfigure(encoding='utf-8')
tree = ET.parse(sys.argv[1])
for elem in tree.iter():
    if elem.attrib.get('text'):
        print(f"{elem.attrib.get('text')} : {elem.attrib.get('bounds')}")
