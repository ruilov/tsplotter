import os, threading, time
from websocket_server import WebsocketServer
import Tkinter, tkFileDialog

class Server:

  def __init__(self):
    self.isrunning = False
    self.PORT = 9001
    self.url = 'file://' + os.getcwd() + '/tsplotter/tsplotter.html'
    self.chrome_path = 'open -a /Applications/Google\ Chrome.app %s' # MacOS
    # chrome_path = 'C:\Program Files (x86)\Google\Chrome\Application\chrome.exe %s' # Windows
    # chrome_path = '/usr/bin/google-chrome %s' # Linux

  def start(self,open_chrome=False):
    if self.isrunning: return

    self.server = WebsocketServer(self.PORT)
    self.server.set_fn_message_received(lambda client,server,message: self.message_received(client,server,message))
    threading.Thread(target = self.server.run_forever).start()

    time.sleep(0.1)
    if open_chrome:
      webbrowser.get(self.chrome_path).open(self.url)

    self.fileSave = False
    self.window = Tkinter.Tk()
    self.window.withdraw()
    self.window.update()
    self.window.after(100,self.checkEvents)
    self.window.mainloop()

    self.isrunning = True

  def stop(self):
    if not self.isrunning: return

    self.server.shutdown()
    self.window.quit()
    self.isrunning = False

  def message_received(self, client, server, message):
    self.fileSave = message

  def checkEvents(self):
    if self.fileSave:
      options = {
        'defaultextension': '.ts',
        'filetypes': [('all files', '.*'), ('text files', '.ts')],
        'initialdir': os.getcwd() + "/tsplotter/plots",
        'initialfile': 'myplot.ts',
        'parent': self.window,
        'title': 'TS Plotter',
      }

      self.window.lift()
      self.window.wm_attributes('-topmost', 1)
      filename = tkFileDialog.asksaveasfilename(**options)
      if(filename!=""):
        print "savings to:",filename
        file = open(filename,'w')
        file.write(self.fileSave)
        file.close()

      self.fileSave = False

    self.window.after(500,self.checkEvents)

SERVER = Server()
try:
  SERVER.start()
except KeyboardInterrupt:
  SERVER.stop()