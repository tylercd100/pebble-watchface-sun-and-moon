#include <pebble.h>

#define INSET 3
#define BG_COLOR GColorBlack;

static Window *s_main_window;
static Layer *s_canvas;
static BitmapLayer *earth_layer;
static GBitmap *earth_bitmap;
static char time_buffer[8];
static int sun_angle = -1,
           moon_angle = -1;

static void inbox_received_handler(DictionaryIterator *iter, void *context) {
  Tuple *data_sun = dict_find(iter, MESSAGE_KEY_SUN_ANGLE);
  if(data_sun) {
    sun_angle = data_sun->value->int32;
    layer_mark_dirty(s_canvas);
  }

  Tuple *data_moon = dict_find(iter, MESSAGE_KEY_MOON_ANGLE);
  if(data_moon) {
    moon_angle = data_moon->value->int32;
    layer_mark_dirty(s_canvas);
  }
}

static void tick_handler(struct tm *tick_time, TimeUnits units_changed) {
  strftime(time_buffer, sizeof(time_buffer), clock_is_24h_style() ? "%H:%M" : "%I:%M", tick_time);
  layer_mark_dirty(s_canvas);
}

static void layer_update_proc(Layer *layer, GContext *ctx) {
  GRect bounds = layer_get_bounds(layer); 
  GPoint center = grect_center_point(&bounds);
  GRect frame;
  GPoint pos;

  //Sun
  if(sun_angle>=0){
    frame = grect_inset(bounds, GEdgeInsets(16));
    pos = gpoint_from_polar(frame, GOvalScaleModeFitCircle, DEG_TO_TRIGANGLE(sun_angle-90));
    graphics_context_set_fill_color(ctx, GColorYellow);
    graphics_fill_circle(ctx, pos, 8);
    graphics_context_set_stroke_color(ctx, GColorYellow);
  }

  //Moon
  if(moon_angle>=0){
    frame = grect_inset(bounds, GEdgeInsets(16));
    pos = gpoint_from_polar(frame, GOvalScaleModeFitCircle, DEG_TO_TRIGANGLE(moon_angle-90));
    graphics_context_set_fill_color(ctx, GColorWhite);
    graphics_fill_circle(ctx, pos, 5);
    graphics_context_set_stroke_color(ctx, GColorWhite);
  }

  //Earth
  graphics_context_set_compositing_mode(ctx, GCompOpSet);
  GRect earth_bounds = gbitmap_get_bounds(earth_bitmap);
  grect_align(&earth_bounds, &bounds, GAlignCenter, false);
  graphics_draw_bitmap_in_rect(ctx, earth_bitmap, earth_bounds);

  //Time
  GTextAttributes *attr = graphics_text_attributes_create();
  int font_size = 34;
  int text_y = (earth_bounds.origin.y + (earth_bounds.size.h / 2)) - (font_size/2);
  GRect text_bounds = GRect(earth_bounds.origin.x, text_y, earth_bounds.size.w, 14);
  graphics_draw_text(ctx, time_buffer, fonts_get_system_font(FONT_KEY_GOTHIC_24), text_bounds, GTextOverflowModeWordWrap, GTextAlignmentCenter, attr);
}

static void window_load(Window *window) {
  Layer *window_layer = window_get_root_layer(window);
  GRect bounds = layer_get_bounds(window_layer);
  window_set_background_color(window,GColorBlack);

  // Create Canvas
  s_canvas = layer_create(bounds);
  layer_set_update_proc(s_canvas, layer_update_proc);

  // Create Earth
  earth_bitmap = gbitmap_create_with_resource(RESOURCE_ID_IMAGE_EARTH_BASALT);

  // Layer Order
  layer_add_child(window_layer, s_canvas);
}

static void window_unload(Window *window) {
  layer_destroy(s_canvas);
  gbitmap_destroy(earth_bitmap);
}

static void init() {
  s_main_window = window_create();
  window_set_window_handlers(s_main_window, (WindowHandlers) {
    .load = window_load,
    .unload = window_unload,
  });
  window_stack_push(s_main_window, true);

  tick_timer_service_subscribe(MINUTE_UNIT, tick_handler);

  app_message_register_inbox_received(inbox_received_handler);
  app_message_open(64, 64);
}

static void deinit() {
  window_destroy(s_main_window);
}

int main() {
  init();
  app_event_loop();
  deinit();
}