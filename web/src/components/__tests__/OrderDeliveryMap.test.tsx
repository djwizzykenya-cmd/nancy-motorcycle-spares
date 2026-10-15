import { fireEvent, render, screen } from "@testing-library/react";
import OrderDeliveryMap from "@/components/OrderDeliveryMap";

const mockMap = {
  setView: jest.fn(),
  fitBounds: jest.fn(),
  remove: jest.fn()
};
const mockPolyline = {
  addTo: jest.fn(),
  getBounds: jest.fn(() => ({})),
  remove: jest.fn()
};
const mockRoutePoints: number[][] = [];
const originalFetch = global.fetch;

mockMap.setView.mockReturnValue(mockMap);
mockPolyline.addTo.mockReturnValue(mockPolyline);

jest.mock("leaflet", () => ({
  map: () => mockMap,
  tileLayer: () => ({ addTo: jest.fn() }),
  icon: jest.fn(() => ({})),
  marker: () => ({
    addTo: () => ({ bindPopup: jest.fn() })
  }),
  polyline: (points: number[][]) => {
    mockRoutePoints.push(...points);
    return mockPolyline;
  }
}));

describe("OrderDeliveryMap", () => {
  afterEach(() => {
    jest.restoreAllMocks();
    if (originalFetch) global.fetch = originalFetch;
    else Reflect.deleteProperty(globalThis, "fetch");
    mockRoutePoints.length = 0;
    mockMap.fitBounds.mockClear();
    mockMap.remove.mockClear();
  });

  it("shows the saved delivery destination on an accessible map and provides an external map link", async () => {
    render(
      <OrderDeliveryMap
        latitude={-1.286389}
        longitude={36.817223}
        label="Nairobi delivery address"
      />
    );

    expect(await screen.findByRole("application", { name: /nairobi delivery address/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /open destination in openstreetmap/i })).toHaveAttribute(
      "href",
      "https://www.openstreetmap.org/?mlat=-1.286389&mlon=36.817223#map=16/-1.286389/36.817223"
    );
  });

  it("does not guess a map destination when coordinates are missing", () => {
    render(<OrderDeliveryMap latitude={null} longitude={null} label="Older delivery" />);

    expect(screen.getByText(/map unavailable: this order does not have saved delivery coordinates/i)).toBeInTheDocument();
    expect(screen.queryByRole("application")).not.toBeInTheDocument();
  });

  it("does not expose route planning to customers by default", () => {
    render(<OrderDeliveryMap latitude={-1.286389} longitude={36.817223} label="Nairobi destination" />);

    expect(screen.queryByRole("button", { name: /plan route/i })).not.toBeInTheDocument();
  });

  it("gets the admin's current location and draws the driving route to the delivery pin", async () => {
    const getCurrentPosition = jest.fn((success: PositionCallback) => {
      success({
        coords: { latitude: -1.3, longitude: 36.8 } as GeolocationCoordinates,
        timestamp: Date.now()
      } as GeolocationPosition);
    });
    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: { getCurrentPosition }
    });
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        code: "Ok",
        routes: [{
          distance: 4200,
          duration: 900,
          geometry: { coordinates: [[36.8, -1.3], [36.817223, -1.286389]] }
        }]
      })
    } as Response);
    global.fetch = fetchMock;

    render(
      <OrderDeliveryMap
        latitude={-1.286389}
        longitude={36.817223}
        label="Nairobi delivery address"
        allowRoutePlanning
      />
    );

    await screen.findByRole("application", { name: /nairobi delivery address/i });
    fireEvent.click(screen.getByRole("button", { name: /plan route from my location/i }));

    expect(getCurrentPosition).toHaveBeenCalled();
    expect(await screen.findByRole("status")).toHaveTextContent("4.2 km");
    expect(fetchMock).toHaveBeenCalledWith(
      "https://router.project-osrm.org/route/v1/driving/36.8,-1.3;36.817223,-1.286389?overview=full&geometries=geojson"
    );
    expect(mockRoutePoints).toEqual([[-1.3, 36.8], [-1.286389, 36.817223]]);
    expect(screen.getByRole("link", { name: /turn-by-turn directions in google maps/i })).toHaveAttribute(
      "href",
      "https://www.google.com/maps/dir/?api=1&origin=-1.3,36.8&destination=-1.286389,36.817223&travelmode=driving"
    );
  });
});
