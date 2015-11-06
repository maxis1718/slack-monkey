# encoding: utf-8

# fetch mongodb > beauty.lists
# get post url 
# request the post
# parse the post and extract images
# save the post

# beauty.lists
# {
#     "post_id": "M.1446701090.A.658",
#     "push": 4,
#     "full_title": "[正妹] 又正又會讀書",
#     "tag": "正妹",
#     "title": "又正又會讀書",
#     "url": "https://www.ptt.cc/bbs/Beauty/M.1446701090.A.658.html",
#     "mark": "",
#     "fetched": false,

#     ## new contents
#     "image_count": 7,
#     "datetime": datetime.datetime(2015, 11, 5, 5, 24, 47),
#     "author": 'pk698326889 (JiMiHua)',
#     "raw_meta": { 
#       '作者': 'gaiaesque (一起來浸水桶吧)',
#       '看板': 'Beauty',
#       '標題': '[正妹] 平祐奈 甜美正妹',
#       '時間': 'Thu Oct 22 22:30:31 2015'
#     }
# }

# beauty.posts
# {
#     'post_id': 'M.1446702709.A.C55',
#     'img_url': 'http://i.imgur.com/OOGlbSX.jpg',
#     'img_idx': 0,
#     'img_total': 7,
# }

from pymongo import MongoClient
from lxml import html
import requests
import parse_post
import random, time

uri = 'mongodb://beauty:beauty@ds049754.mongolab.com:49754/slack';

mc = MongoClient(uri)
db = mc['slack']
co_lists = db['beauty.lists']
co_posts = db['beauty.posts']

def get_page_tree(url):
    page = requests.get(url)
    tree = html.fromstring(page.text)
    return tree

def save_post_imgs_to_mongo(co, img_items):
    results = co.insert_many(img_items)
    return results

def get_one_unfeched_post(co):
    # !ignore AND ( !fetched || !exists(fetched) )
    query = {
        'ignore': { '$exists': False },
        '$or':[ 
            { 'fetched': False },
            { 'fetched': { '$exists': False } } 
        ]
    }
    mdoc = co.find_one(query)
    return mdoc

def get_parsed_data(tree):
    # parsing
    parsed_data = {}
    parsed_data['imgs'] = parse_post.collect_images(tree)
    parsed_data['raw_meta'] = parse_post.collect_raw_meta(tree)
    parsed_data['meta'] = parse_post.collect_meta(parsed_data['raw_meta'])
    return parsed_data

def build_update_doc(parsed_data):
    update_doc = {
        "image_count": len(parsed_data['imgs']),
        "datetime": parsed_data['meta']['datetime'],
        "author": parsed_data['meta']['author'],
        "raw_meta": parsed_data['raw_meta'],
        'fetched': True
    }
    return update_doc 

# include:
#   正妹,神人,帥哥,美女,正咩,表特,名人
# exclude:
#   廣告,公告,新聞,挑戰,討論,申訴,協尋,情報
VALID_TYPE = set([u'正妹',u'神人',u'帥哥',u'美女',u'正咩',u'表特',u'名人'])

if __name__ == '__main__':

    # get total posts
    total_posts = co_lists.count()
    processed = 0

    while True:

        # find an unfetched post
        mdoc = get_one_unfeched_post(co_lists)

        if not mdoc:
            break

        ignored = ''
        img_items = []
        if mdoc['tag'] not in VALID_TYPE:
            ignored = '(ignore)'
            # ignore this post and marked as fetched
            query = { 'post_id': mdoc['post_id'] }
            update = { '$set': { 'fetched': False, 'ignore': True } }
            co_lists.update_one(query, update)
        else:
            # fetch a post
            # https://www.ptt.cc/bbs/Beauty/M.1446701090.A.658.html
            entry = mdoc['url']
            tree = get_page_tree(entry)

            parsed_data = get_parsed_data(tree)

            update_doc = build_update_doc(parsed_data)

            # after parsing
            # save meta to beauty.lists
            query = { 'post_id': mdoc['post_id'] }
            update = { '$set': update_doc }
            co_lists.find_one_and_update(query, update)

            for img_idx, img_url in enumerate(parsed_data['imgs']):
                img_item = {
                    'post_id': mdoc['post_id'],
                    'img_url': img_url,
                    'img_idx': img_idx,
                    'img_total': len(parsed_data['imgs']),
                    'display': 0
                }
                img_items.append(img_item)

            # save post img url to beauty.posts
            if len(img_items) > 0:
                save_post_imgs_to_mongo(co_posts, img_items)

        processed += 1
        print '> (', len(img_items) ,')', processed, '/', total_posts, mdoc['post_id'], mdoc['full_title'], ignored

        wait = random.randrange(1,6)
        print '> wait for', wait, 'secs'
        time.sleep(wait)        
