class MyDict(dict):
  pass

def generic_get(self, item):
  item2 = item
  if type(item)==tuple: item2 = item[0]

  try:
    return type(self).__bases__[0].__getitem__(self, item2)
  except KeyError:
    if type(item)!=tuple: default = type(self)()
    else: default = item[1]()

    value = self[item2] = default
    return value

MyDict.__getitem__ = generic_get